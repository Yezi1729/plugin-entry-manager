import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import {
  ConfigCorruptError,
  RevisionConflict,
  configPathFor,
  createDefaultConfig,
  normalizeConfig,
  readConfig,
  resetConfig,
  saveConfig,
} from '../index.js';

const TMP_ROOT = join(process.cwd(), '.test-tmp');

async function makeHome(prefix) {
  await mkdir(TMP_ROOT, { recursive: true });
  return mkdtemp(join(TMP_ROOT, prefix));
}

test('normalizeConfig: 排序、重编号、跨文件夹去重、非法颜色回退', () => {
  const result = normalizeConfig({
    version: 99,
    revision: 4,
    folders: [
      { id: 'f_b', name: ' 插件系列一 ', order: 5, entries: ['x', 'y'], color: '#bad' },
      { id: 'f_a', name: '工具箱', order: 1, entries: ['y', 'z'] },
    ],
    settings: { folderClick: 'nope' },
  });

  assert.equal(result.version, 1);
  assert.equal(result.revision, 4);
  assert.deepEqual(result.folders.map((folder) => folder.name), ['工具箱', '插件系列一']);
  assert.deepEqual(result.folders.map((folder) => folder.order), [0, 1]);
  // 输入顺序里 f_b 先拿到 y，f_a 只能拿 z；排序后按文件夹名展示。
  assert.deepEqual(result.folders[0].entries, ['z']);
  assert.deepEqual(result.folders[1].entries, ['x', 'y']);
  assert.equal(result.folders[1].color, 'blue');
  assert.equal(result.settings.folderClick, 'page');
});

test('normalizeConfig: 严格模式拒绝空名称与重复 id', () => {
  assert.throws(() => normalizeConfig({ folders: [{ id: 'f_a', name: '  ', entries: [] }] }), /文件夹名称/);
  assert.throws(
    () =>
      normalizeConfig({
        folders: [
          { id: 'f_a', name: 'A', entries: [] },
          { id: 'f_a', name: 'B', entries: [] },
        ],
      }),
    /重复/,
  );
});

test('readConfig / saveConfig: 默认配置、版本递增、冲突检测', async () => {
  const home = await makeHome('pem-home-');
  try {
    const initial = await readConfig({ home });
    assert.equal(initial.revision, 0);
    assert.deepEqual(initial.folders, []);

    const saved = await saveConfig(
      {
        ...initial,
        folders: [{ id: 'f_demo', name: '插件系列一', order: 0, entries: ['audio-mixer'] }],
      },
      { home, expectedRevision: initial.revision },
    );
    assert.equal(saved.revision, 1);
    assert.equal(saved.folders[0].name, '插件系列一');

    const reloaded = await readConfig({ home });
    assert.equal(reloaded.revision, 1);
    assert.deepEqual(reloaded.folders[0].entries, ['audio-mixer']);

    await assert.rejects(
      () => saveConfig({ ...reloaded }, { home, expectedRevision: 0 }),
      (error) => error instanceof RevisionConflict && error.current.revision === 1,
    );
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('writeConfigFile: 覆盖前备份，最多保留 3 份', async () => {
  const home = await makeHome('pem-backup-');
  try {
    let config = await readConfig({ home });
    for (let index = 0; index < 5; index += 1) {
      config = await saveConfig(
        {
          ...config,
          folders: [{ id: 'f_demo', name: '插件系列一', order: 0, entries: [`panel-${index}`] }],
        },
        { home, expectedRevision: config.revision },
      );
    }
    const names = await readdir(join(home, 'plugin-entry-manager'));
    const backups = names.filter((entry) => entry.startsWith('config.json.bak-'));
    assert.ok(backups.length <= 3, `backups=${backups.length}`);
    assert.ok(backups.length >= 1);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('readConfig: 损坏文件不静默覆盖', async () => {
  const home = await makeHome('pem-corrupt-');
  try {
    const file = configPathFor(home);
    await mkdir(join(home, 'plugin-entry-manager'), { recursive: true });
    await writeFile(file, '{ not json', 'utf8');
    await assert.rejects(() => readConfig({ home }), (error) => error instanceof ConfigCorruptError);
    const after = await readFile(file, 'utf8');
    assert.equal(after, '{ not json');
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('resetConfig: 损坏文件先备份再写默认配置', async () => {
  const home = await makeHome('pem-reset-');
  try {
    const file = configPathFor(home);
    await mkdir(join(home, 'plugin-entry-manager'), { recursive: true });
    await writeFile(file, '{ bad json', 'utf8');

    const config = await resetConfig({ home });
    assert.equal(config.revision, 0);
    assert.deepEqual(config.folders, []);

    const names = await readdir(join(home, 'plugin-entry-manager'));
    assert.ok(names.some((entry) => entry.startsWith('config.json.reset-')));

    const reloaded = await readConfig({ home });
    assert.deepEqual(reloaded.folders, []);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('createDefaultConfig: 结构稳定', () => {
  const config = createDefaultConfig();
  assert.equal(config.version, 1);
  assert.equal(config.revision, 0);
  assert.deepEqual(config.folders, []);
  assert.equal(config.settings.folderClick, 'page');
  assert.deepEqual(config.stale, {});
});
