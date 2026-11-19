import assert from 'node:assert/strict';
import test from 'node:test';

const reactStub = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useEffect: () => {},
  useState: (initial) => [initial, () => {}],
  useSyncExternalStore: () => ({}),
};

const config = {
  version: 1,
  revision: 2,
  updatedAt: '2026-11-17T12:00:00.000Z',
  folders: [
    { id: 'f_series', name: '插件系列一', color: 'blue', order: 0, entries: ['audio-mixer'] },
    { id: 'f_tools', name: '工具箱', color: 'green', order: 1, entries: [] },
  ],
  settings: {
    showManagerEntry: true,
    showFolderEntries: true,
    folderClick: 'page',
    defaultTab: 'folders',
  },
  stale: {},
};

test('client runtime: 注册管理器与文件夹行/页，dispose 时全部反注册', async () => {
  const registrations = [];
  let plugin;

  globalThis.window = {
    __ModuleLoader__: {
      load({ factory }) {
        plugin = factory(() => reactStub);
      },
    },
    addEventListener() {},
    removeEventListener() {},
  };

  // 每次 import 都重新执行模块；用查询串避免测试间缓存。
  await import(`../client.js?runtime=${Date.now()}`);

  const ctx = {
    slots: {
      entriesOfSlot: (name) =>
        name === 'main'
          ? [
              { options: { key: 'plugins', label: '插件' } },
              { options: { key: 'schedules', label: '自动化任务' } },
              { options: { key: 'surfcore-console', label: 'SurfCore' } },
              { options: { key: 'conversation' } },
              { options: { key: 'plugin-entry-manager' } },
              { options: { key: 'pem-folder-f_series' } },
            ]
          : [
              { options: { id: 'plugins', order: 10, label: '插件' } },
              { options: { id: 'audio-mixer', order: 22, label: '音频合成' } },
              { options: { id: 'schedules', order: 30, label: '自动化任务' } },
              { options: { id: 'plugin-entry-manager', order: 900, label: () => '插件入口' } },
            ],
      inject: (_slot, callback) => callback(),
      subscribe: () => () => {},
      register: (options, component) => {
        const record = { options, component, disposed: false };
        registrations.push(record);
        return () => {
          record.disposed = true;
        };
      },
    },
    layout: {
      panelInfo: { getSnapshot: () => ({ activePanelId: null }) },
      selectPanel: () => {},
    },
    locale: {
      register: () => () => {},
      bind: () => (key) => key,
      subscribe: () => () => {},
      getSnapshot: () => ({ locale: 'zh' }),
    },
  };

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, config }),
  });

  const dispose = plugin.apply(ctx);
  assert.equal(plugin.inject.includes('layout'), true);
  await new Promise((resolve) => setTimeout(resolve, 20));

  const sidebar = registrations.filter((entry) => entry.options.name === 'sidebar.panellist');
  const main = registrations.filter((entry) => entry.options.name === 'main');

  assert.equal(sidebar.length, 3); // 管理器 + 两个文件夹
  assert.equal(main.length, 3);
  assert.ok(sidebar.some((entry) => entry.options.id === 'plugin-entry-manager'));
  assert.ok(sidebar.some((entry) => entry.options.id === 'pem-folder-f_series'));
  assert.ok(sidebar.some((entry) => entry.options.id === 'pem-folder-f_tools'));
  assert.ok(main.some((entry) => entry.options.key === 'pem-folder-f_series'));

  const seriesRow = sidebar.find((entry) => entry.options.id === 'pem-folder-f_series');
  assert.equal(seriesRow.options.label(), '插件系列一');
  assert.equal(seriesRow.options.order, 910);
  assert.equal(sidebar.find((entry) => entry.options.id === 'pem-folder-f_tools').options.order, 911);

  const panels = plugin.__test.getPanels();
  const surfcore = panels.find((panel) => panel.id === 'surfcore-console');
  assert.ok(surfcore?.hasMain, 'main-only SurfCore must be discovered');
  assert.equal(surfcore.hasSidebar, false);
  assert.equal(surfcore.label, 'SurfCore');
  assert.ok(!panels.some((panel) => panel.id === 'conversation'), 'conversation must be excluded');
  assert.ok(!panels.some((panel) => panel.id === 'plugin-entry-manager'), 'manager must be excluded');
  assert.ok(!panels.some((panel) => panel.id.startsWith('pem-folder-')), 'folder pages must be excluded');
  assert.ok(panels.find((panel) => panel.id === 'plugins')?.hasSidebar);
  assert.ok(panels.find((panel) => panel.id === 'audio-mixer')?.hasMain === false, 'sidebar-only stays non-openable');

  dispose();

  assert.ok(registrations.every((entry) => entry.disposed), '所有注册项都应被反注册');
});
