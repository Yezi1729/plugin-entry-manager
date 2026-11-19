/**
 * Host half of the plugin-entry-manager bundle.
 *
 * 职责边界：
 *   - 只持久化"入口分组配置"到 $DSH_HOME/plugin-entry-manager/config.json；
 *   - 不读取、不修改任何插件的启用状态，不碰其他插件的文件；
 *   - 所有写操作原子化，并在覆盖前保留最近 3 份备份。
 *
 * 对外 HTTP（仅回环地址）：
 *   GET /plugin-entry-manager/api/health
 *   GET /plugin-entry-manager/api/config
 *   PUT /plugin-entry-manager/api/config  { config, revision }
 *
 * 这些纯函数（normalizeConfig / readConfig / saveConfig）也被 host 单测直接调用。
 */
import { randomUUID } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { access, copyFile, mkdir, open, readFile, readdir, rename, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const name = 'plugin-entry-manager';
export const inject = ['webServer'];

const PREFIX = '/plugin-entry-manager';
const CONFIG_DIR = 'plugin-entry-manager';
const CONFIG_FILE = 'config.json';
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_FOLDERS = 200;
const MAX_ENTRIES_PER_FOLDER = 500;
const MAX_NAME_LENGTH = 40;
const MAX_ENTRY_ID_LENGTH = 200;
const MAX_BACKUPS = 3;
const FOLDER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const PANEL_ID_RE = /^[A-Za-z0-9@._:/#-]{1,200}$/;
const COLOR_RE = /^[a-z][a-z0-9-]{1,15}$/;
const FOLDER_CLICKS = new Set(['page', 'tree']);
const TABS = new Set(['folders', 'entries', 'settings']);

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class RevisionConflict extends Error {
  constructor(current) {
    super('配置已在别处修改');
    this.name = 'RevisionConflict';
    this.current = current;
  }
}

export class ConfigCorruptError extends Error {
  constructor(path, detail) {
    super(`配置文件无法解析：${detail}`);
    this.name = 'ConfigCorruptError';
    this.path = path;
    this.detail = detail;
  }
}

export function createDefaultConfig() {
  return {
    version: 1,
    revision: 0,
    updatedAt: new Date().toISOString(),
    folders: [],
    settings: {
      showManagerEntry: true,
      showFolderEntries: true,
      folderClick: 'page',
      defaultTab: 'folders',
    },
    stale: {},
  };
}

function asBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function asTimestamp(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback;
}

/**
 * 归一化配置：写入时严格（抛 ConfigError），读取时宽松（丢弃坏文件夹而不是整份失败）。
 * 不变量：一个入口最多属于一个文件夹；文件夹按 order 排序后重新编号。
 */
export function normalizeConfig(input, { strict = true } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ConfigError('配置必须是一个对象');
  }

  const defaults = createDefaultConfig();
  const rawFolders = input.folders;
  if (rawFolders !== undefined && !Array.isArray(rawFolders)) {
    if (strict) throw new ConfigError('folders 必须是数组');
  }
  const folderList = Array.isArray(rawFolders) ? rawFolders : [];
  if (folderList.length > MAX_FOLDERS) {
    if (strict) throw new ConfigError(`文件夹数量不能超过 ${MAX_FOLDERS}`);
  }

  const seenEntries = new Set();
  const seenFolderIds = new Set();
  const folders = [];

  for (const raw of folderList.slice(0, MAX_FOLDERS)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      if (strict) throw new ConfigError('文件夹必须是一个对象');
      continue;
    }

    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!name || name.length > MAX_NAME_LENGTH) {
      if (strict) throw new ConfigError(`文件夹名称需为 1–${MAX_NAME_LENGTH} 个字符`);
      continue;
    }

    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    if (!FOLDER_ID_RE.test(id)) {
      if (strict) throw new ConfigError('文件夹 id 不合法');
      continue;
    }
    if (seenFolderIds.has(id)) {
      if (strict) throw new ConfigError(`文件夹 id 重复：${id}`);
      continue;
    }
    seenFolderIds.add(id);

    const entries = [];
    const rawEntries = Array.isArray(raw.entries) ? raw.entries : [];
    for (const candidate of rawEntries) {
      if (typeof candidate !== 'string') continue;
      const entryId = candidate.trim();
      if (!entryId || entryId.length > MAX_ENTRY_ID_LENGTH) continue;
      if (seenEntries.has(entryId)) continue;
      seenEntries.add(entryId);
      entries.push(entryId);
      if (entries.length >= MAX_ENTRIES_PER_FOLDER) break;
    }

    const order = Number.isFinite(raw.order) ? Number(raw.order) : folders.length;
    const color = typeof raw.color === 'string' && COLOR_RE.test(raw.color) ? raw.color : 'blue';

    folders.push({
      id,
      name,
      color,
      order: Math.max(-1_000_000, Math.min(1_000_000, order)),
      collapsed: asBoolean(raw.collapsed, false),
      entries,
    });
  }

  if (folders.length === 0 && folderList.length > 0 && strict) {
    throw new ConfigError('没有可用的文件夹');
  }

  folders.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  folders.forEach((folder, index) => {
    folder.order = index;
  });

  const rawSettings = input.settings && typeof input.settings === 'object' ? input.settings : {};
  const settings = {
    showManagerEntry: asBoolean(rawSettings.showManagerEntry, defaults.settings.showManagerEntry),
    showFolderEntries: asBoolean(rawSettings.showFolderEntries, defaults.settings.showFolderEntries),
    folderClick: FOLDER_CLICKS.has(rawSettings.folderClick) ? rawSettings.folderClick : defaults.settings.folderClick,
    defaultTab: TABS.has(rawSettings.defaultTab) ? rawSettings.defaultTab : defaults.settings.defaultTab,
  };

  const stale = {};
  if (input.stale && typeof input.stale === 'object' && !Array.isArray(input.stale)) {
    for (const [key, value] of Object.entries(input.stale).slice(0, 500)) {
      if (!PANEL_ID_RE.test(key) || !value || typeof value !== 'object') continue;
      stale[key] = {
        label: typeof value.label === 'string' ? value.label.slice(0, 80) : key,
        lastSeenAt: asTimestamp(value.lastSeenAt, new Date().toISOString()),
      };
    }
  }

  const revision = Number.isInteger(input.revision) && input.revision >= 0 ? input.revision : 0;

  return {
    version: 1,
    revision,
    updatedAt: asTimestamp(input.updatedAt, new Date().toISOString()),
    folders,
    settings,
    stale,
  };
}

export function resolveHome(home) {
  const explicit = typeof home === 'string' && home.trim() ? home.trim() : '';
  if (explicit) return explicit;
  const env = typeof process.env.DSH_HOME === 'string' ? process.env.DSH_HOME.trim() : '';
  return env || join(homedir(), '.dsh');
}

export function configPathFor(home) {
  return join(resolveHome(home), CONFIG_DIR, CONFIG_FILE);
}

async function pruneBackups(file) {
  const dir = dirname(file);
  const prefix = `${CONFIG_FILE}.bak-`;
  let names;
  try {
    names = await readdir(dir);
  } catch {
    return;
  }
  const backups = names
    .filter((entry) => entry.startsWith(prefix))
    .sort()
    .reverse();
  await Promise.all(
    backups.slice(MAX_BACKUPS).map((entry) =>
      unlink(join(dir, entry)).catch(() => {
        /* 备份清理失败不影响主写入 */
      }),
    ),
  );
}

/**
 * 原子写：先写同目录临时文件并 fsync，再 rename；rename 前把旧文件复制成备份。
 */
export async function writeConfigFile(config, file) {
  const dir = dirname(file);
  await mkdir(dir, { recursive: true });

  try {
    const backup = `${file}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    await copyFile(file, backup);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const tmp = `${file}.tmp-${process.pid}-${randomUUID().slice(0, 8)}`;
  const handle = await open(tmp, 'wx');
  try {
    await handle.writeFile(`${JSON.stringify(config, null, 2)}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }

  try {
    await rename(tmp, file);
  } catch (error) {
    await unlink(tmp).catch(() => {});
    throw error;
  }

  await pruneBackups(file);
}

/**
 * 读取配置：不存在则创建默认配置；损坏时抛 ConfigCorruptError（不静默覆盖用户数据）。
 * 读取采用宽松归一化，坏文件夹会被丢弃但整份配置仍可用。
 */
export async function readConfig({ home } = {}) {
  const file = configPathFor(home);
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      const config = createDefaultConfig();
      await writeConfigFile(config, file);
      return config;
    }
    throw error;
  }

  let raw;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new ConfigCorruptError(file, error.message);
  }

  try {
    return normalizeConfig(raw, { strict: false });
  } catch (error) {
    throw new ConfigCorruptError(file, error.message);
  }
}

/**
 * 同一进程内串行化写入：多个窗口同时 PUT 时，先到的先读 revision，避免两个请求都基于旧版本通过校验。
 * 跨进程仍由 revision 乐观锁兜底。
 */
const writeQueues = new Map();

function withWriteLock(file, task) {
  const previous = writeQueues.get(file) ?? Promise.resolve();
  const next = previous.then(task, task);
  writeQueues.set(
    file,
    next.catch(() => {
      /* 队列继续，错误交给调用方 */
    }),
  );
  return next;
}

/**
 * 保存配置：expectedRevision 不匹配时抛 RevisionConflict，由路由转成 409。
 */
export function saveConfig(input, { home, expectedRevision } = {}) {
  const file = configPathFor(home);
  return withWriteLock(file, async () => {
    const current = await readConfig({ home });
    if (
      expectedRevision !== undefined &&
      expectedRevision !== null &&
      Number(expectedRevision) !== current.revision
    ) {
      throw new RevisionConflict(current);
    }

    const next = normalizeConfig(input, { strict: true });
    next.revision = current.revision + 1;
    next.updatedAt = new Date().toISOString();
    await writeConfigFile(next, file);
    return next;
  });
}

/**
 * 配置损坏时的恢复入口：先把现有文件复制成 .reset-<时间戳> 备份，再写入默认配置。
 * 不读取旧文件，因此坏 JSON 也能被恢复。
 */
export async function resetConfig({ home } = {}) {
  const file = configPathFor(home);
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await copyFile(file, `${file}.reset-${stamp}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const config = createDefaultConfig();
  await writeConfigFile(config, file);
  return config;
}

/* ------------------------------------------------------------------ */
/* HTTP                                                                 */
/* ------------------------------------------------------------------ */
function sendJson(res, status, value) {
  try {
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    });
    res.end(JSON.stringify(value));
  } catch {
    /* 响应已关闭：忽略 */
  }
}

function isLoopbackHost(hostHeader) {
  const host = String(hostHeader ?? '').trim().toLowerCase();
  if (!host) return false;
  const name = host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.split(':')[0];
  return name === '127.0.0.1' || name === 'localhost' || name === '[::1]' || name === '::1';
}

function isLoopbackOrigin(origin) {
  try {
    return isLoopbackHost(new URL(origin).host);
  } catch {
    return false;
  }
}

function guard(req, res) {
  if (!isLoopbackHost(req.headers?.host)) {
    sendJson(res, 403, { ok: false, error: '仅允许本机访问' });
    return false;
  }
  const origin = req.headers?.origin;
  if (origin && !isLoopbackOrigin(origin)) {
    sendJson(res, 403, { ok: false, error: '仅允许同源访问' });
    return false;
  }
  return true;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new ConfigError('请求体超过 1 MB'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new ConfigError('请求体不是合法 JSON'));
      }
    });
    req.on('error', reject);
    req.on('aborted', () => reject(new ConfigError('请求被中断')));
  });
}

let versionPromise;
function packageVersion() {
  if (!versionPromise) {
    versionPromise = readFile(new URL('./package.json', import.meta.url), 'utf8')
      .then((text) => JSON.parse(text).version)
      .catch(() => '0.1.0');
  }
  return versionPromise;
}

async function handleHealth(req, res) {
  if (!guard(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' });
    res.end();
    return;
  }
  const file = configPathFor();
  let writable = true;
  try {
    await mkdir(dirname(file), { recursive: true });
    await access(dirname(file), fsConstants.W_OK);
  } catch {
    writable = false;
  }
  sendJson(res, 200, {
    ok: true,
    version: await packageVersion(),
    configPath: file,
    writable,
  });
}

async function handleConfig(req, res) {
  if (!guard(req, res)) return;

  if (req.method === 'POST') {
    const config = await resetConfig();
    sendJson(res, 200, { ok: true, config });
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    const config = await readConfig();
    sendJson(res, 200, { ok: true, config });
    return;
  }

  if (req.method !== 'PUT') {
    res.writeHead(405, { allow: 'GET, HEAD, POST, PUT' });
    res.end();
    return;
  }

  const contentType = String(req.headers?.['content-type'] ?? '');
  if (!contentType.toLowerCase().includes('application/json')) {
    sendJson(res, 415, { ok: false, error: 'PUT 需要 application/json' });
    return;
  }

  const body = await readJsonBody(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ConfigError('请求体必须是对象');
  }

  try {
    const saved = await saveConfig(body.config, { expectedRevision: body.revision });
    sendJson(res, 200, { ok: true, config: saved });
  } catch (error) {
    if (error instanceof RevisionConflict) {
      sendJson(res, 409, {
        ok: false,
        code: 'revision-conflict',
        error: error.message,
        config: error.current,
      });
      return;
    }
    if (error instanceof ConfigError) {
      sendJson(res, 400, { ok: false, code: 'invalid-config', error: error.message });
      return;
    }
    throw error;
  }
}

const STATE_KEY = Symbol.for('dsh.plugin-entry-manager.routes');

function routeState() {
  if (!globalThis[STATE_KEY]) {
    globalThis[STATE_KEY] = { handlers: new Map() };
  }
  return globalThis[STATE_KEY];
}

/**
 * 每次 apply 都尝试注册：旧实例的路由可能已被释放，也可能仍然存在。
 * 已存在时捕获 "duplicate exact route" 并复用；handler 表始终指向最新实现。
 */
function route(ctx, path, handler) {
  const state = routeState();
  state.handlers.set(path, handler);

  try {
    ctx.effect(
      () =>
        ctx.webServer.register({
          kind: 'exact',
          path,
          handler: (req, res) => {
            const current = state.handlers.get(path);
            if (!current) {
              sendJson(res, 503, { ok: false, error: '服务正在重载，请稍后重试' });
              return;
            }
            Promise.resolve(current(req, res)).catch((error) => {
              if (res.headersSent) {
                res.destroy();
                return;
              }
              if (error instanceof ConfigError) {
                sendJson(res, 400, { ok: false, code: 'invalid-config', error: error.message });
                return;
              }
              if (error instanceof ConfigCorruptError) {
                sendJson(res, 500, {
                  ok: false,
                  code: 'config-corrupt',
                  error: error.message,
                  path: error.path,
                });
                return;
              }
              sendJson(res, 500, {
                ok: false,
                error: '服务器错误',
                detail: String(error?.message ?? error),
              });
            });
          },
        }),
      `plugin-entry-manager route ${path}`,
    );
  } catch (error) {
    if (!/duplicate/i.test(String(error?.message ?? error))) throw error;
  }
}

export function apply(ctx) {
  route(ctx, `${PREFIX}/api/health`, handleHealth);
  route(ctx, `${PREFIX}/api/config`, handleConfig);
}
