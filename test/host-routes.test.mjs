import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { apply } from '../index.js';

const TMP_ROOT = join(process.cwd(), '.test-tmp');

async function makeHome(prefix) {
  await mkdir(TMP_ROOT, { recursive: true });
  return mkdtemp(join(TMP_ROOT, prefix));
}

test('HTTP: health / GET config / PUT config / revision 409', async () => {  const home = await makeHome('pem-routes-');
  const previousHome = process.env.DSH_HOME;
  process.env.DSH_HOME = home;

  const handlers = new Map();
  const ctx = {
    effect(fn) {
      fn();
    },
    webServer: {
      register({ path, handler }) {
        handlers.set(path, handler);
      },
    },
  };
  apply(ctx);

  const server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
    const handler = handlers.get(path);
    if (!handler) {
      res.writeHead(404);
      res.end();
      return;
    }
    Promise.resolve(handler(req, res)).catch((error) => {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(String(error));
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}/plugin-entry-manager/api`;

  try {
    const healthResponse = await fetch(`${base}/health`);
    assert.equal(healthResponse.status, 200);
    const health = await healthResponse.json();
    assert.equal(health.ok, true);
    assert.equal(health.version, '0.1.0');
    assert.ok(health.configPath.includes('plugin-entry-manager'));

    const getResponse = await fetch(`${base}/config`);
    assert.equal(getResponse.status, 200);
    const first = await getResponse.json();
    assert.equal(first.ok, true);
    assert.equal(first.config.revision, 0);
    assert.deepEqual(first.config.folders, []);

    const putResponse = await fetch(`${base}/config`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        revision: first.config.revision,
        config: {
          ...first.config,
          folders: [{ id: 'f_demo', name: '插件系列一', order: 0, entries: ['audio-mixer'] }],
        },
      }),
    });
    assert.equal(putResponse.status, 200);
    const saved = await putResponse.json();
    assert.equal(saved.config.revision, 1);
    assert.equal(saved.config.folders[0].name, '插件系列一');

    const conflictResponse = await fetch(`${base}/config`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ revision: 0, config: saved.config }),
    });
    assert.equal(conflictResponse.status, 409);
    const conflict = await conflictResponse.json();
    assert.equal(conflict.code, 'revision-conflict');
    assert.equal(conflict.config.revision, 1);

    const invalidResponse = await fetch(`${base}/config`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        revision: 1,
        config: { ...saved.config, folders: [{ id: 'f_bad', name: '', entries: [] }] },
      }),
    });
    assert.equal(invalidResponse.status, 400);
    const invalid = await invalidResponse.json();
    assert.equal(invalid.code, 'invalid-config');

    const resetResponse = await fetch(`${base}/config`, { method: 'POST' });
    assert.equal(resetResponse.status, 200);
    const reset = await resetResponse.json();
    assert.equal(reset.config.revision, 0);
    assert.deepEqual(reset.config.folders, []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previousHome === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previousHome;
    await rm(home, { recursive: true, force: true });
  }
});

test('apply 两次：路由会被重新注册（热重载后不 404）', () => {
  let registrations = 0;
  const disposers = [];
  const ctx = {
    effect(fn) {
      const disposer = fn();
      if (typeof disposer === 'function') disposers.push(disposer);
    },
    webServer: {
      register() {
        registrations += 1;
        return () => {
          /* 模拟 webServer 释放路由 */
        };
      },
    },
  };

  apply(ctx);
  assert.equal(registrations, 2); // health + config

  disposers.forEach((dispose) => dispose());
  apply(ctx);
  assert.equal(registrations, 4);
});
