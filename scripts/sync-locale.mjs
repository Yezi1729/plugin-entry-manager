/**
 * 从 client.js 提取内嵌 DICTIONARIES，写出 locale/zh.json 与 locale/en.json。
 * 运行：node scripts/sync-locale.mjs
 *
 * 目的：让两份 locale JSON 与运行时字典保持同一份源，避免手改漂移。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, 'client.js'), 'utf8');

const marker = 'const DICTIONARIES = ';
const markerIndex = source.indexOf(marker);
if (markerIndex < 0) throw new Error('client.js: 找不到 DICTIONARIES');

const braceStart = source.indexOf('{', markerIndex);
const braceEnd = source.indexOf('\n    };', braceStart);
if (braceStart < 0 || braceEnd < 0) throw new Error('client.js: DICTIONARIES 结构无法解析');

const literal = source.slice(braceStart, braceEnd + '\n    }'.length);
const dictionaries = new Function(`return (${literal});`)();

const tags = Object.keys(dictionaries);
if (!tags.includes('zh') || !tags.includes('en')) {
  throw new Error(`DICTIONARIES 缺少 zh/en：${tags.join(', ')}`);
}

const zhKeys = Object.keys(dictionaries.zh).sort();
const enKeys = Object.keys(dictionaries.en).sort();
if (zhKeys.join('|') !== enKeys.join('|')) {
  const missingEn = zhKeys.filter((key) => !(key in dictionaries.en));
  const missingZh = enKeys.filter((key) => !(key in dictionaries.zh));
  throw new Error(`zh/en 键不一致；en 缺 ${missingEn.join(', ')}；zh 缺 ${missingZh.join(', ')}`);
}

for (const tag of ['zh', 'en']) {
  const file = join(root, 'locale', `${tag}.json`);
  writeFileSync(file, `${JSON.stringify(dictionaries[tag], null, 2)}\n`, 'utf8');
  console.log(`wrote ${file} (${Object.keys(dictionaries[tag]).length} keys)`);
}
