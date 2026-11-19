import assert from 'node:assert/strict';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

const clientFile = join(
  process.env.DSH_HOME || join(homedir(), '.dsh'),
  'plugins', 'surfcore', 'lib', 'client.js',
);
const React = {
  createElement(type, props, ...children) {
    return { type, props: props ?? {}, children };
  },
  useCallback: (fn) => fn,
  useEffect() {},
  useMemo: (fn) => fn(),
  useRef: (value) => ({ current: value }),
  useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
};

let plugin;
globalThis.window = {
  __ModuleLoader__: {
    load({ id, factory }) {
      assert.equal(id, 'surfcore');
      plugin = factory((name) => {
        assert.equal(name, 'react');
        return React;
      });
    },
  },
};

await import(pathToFileURL(clientFile).href);
assert.ok(plugin, 'SurfCore client did not load');
assert.deepEqual(plugin.inject, ['slots']);

const rows = [];
const cleanup = [];
const ctx = {
  effect(register) {
    cleanup.push(register());
  },
  slots: {
    inject(name, register) {
      assert.ok(['main', 'sidebar.panellist', 'settings.section'].includes(name));
      return register();
    },
    register(options, component) {
      const row = { options, component, disposed: false };
      rows.push(row);
      return () => { row.disposed = true; };
    },
  },
};

plugin.apply(ctx);
assert.deepEqual(rows.map((row) => row.options.name), ['settings.section', 'main']);
const [settings, panel] = rows;
assert.equal(settings.options.id, 'surfcore');
assert.equal(panel.options.key, 'surfcore-console');
assert.equal(panel.options.label(), 'SurfCore');
assert.equal(settings.component.name, 'QQBIliWhaleSection');
const rendered = panel.component();
assert.equal(rendered.props.className, 'qbw-main-page');
assert.equal(rendered.children[0].type, settings.component, 'Main page must reuse the settings console');
assert.ok(!rows.some((row) => row.options.name === 'sidebar.panellist'), 'SurfCore must not register a sidebar row');
for (const dispose of cleanup.toReversed()) dispose();
assert.ok(rows.every((row) => row.disposed), 'Every slot must be disposed');
console.log('SurfCore settings, main panel, no sidebar row, and cleanup: OK');
