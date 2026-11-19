# plugin-entry-manager

DSH 的**插件主页面管理器**：把有主页面（`main` 注册）的插件按用户自定义的文件夹组织，可以从 PEM 的文件夹页或侧栏成员树打开。

> **只管理主页面入口，不管理插件启停，也不控制其他插件的原生左栏行。** 本插件不启用/停用、不安装/卸载任何插件，也不修改其他插件的文件。

入口发现以 `main.key` 为准：即使插件没有 `sidebar.panellist` 左栏行，只要注册了主页面，也能被 PEM 发现并放入文件夹。

- 设计文档：[../DESIGN-plugin-entry-manager.md](../DESIGN-plugin-entry-manager.md)
- 进度记录：[../PROGRESS.md](../PROGRESS.md)

## 图片展示

### Page 1
<img width="1295" height="900" alt="2bf77823-6aea-4c61-97e9-1ede1c69cd1e" src="https://github.com/user-attachments/assets/9ff55610-4e8c-4038-91e7-6c5b42ea416a" />

### Page 2
<img width="1275" height="973" alt="image" src="https://github.com/user-attachments/assets/4803d874-b383-40c4-8732-0fd79d7b3d38" />

### Page 3
<img width="647" height="279" alt="image" src="https://github.com/user-attachments/assets/be3ace52-a979-45af-9fb7-5502a7f3248d" />



## 功能

- **侧栏管理器行**「插件入口」：打开管理器主页。
- **文件夹行**：新建的每个文件夹都会出现在侧栏；点文字进入文件夹页，点图标展开锚定成员树。
- **侧栏锚定树**：列出文件夹成员，点成员直达插件主页；Esc/点外部/滚动关闭；底部可进文件夹页。
- **入口发现**：同时扫描 `main` 和 `sidebar.panellist`；按 `main.key` 去重。主页面-only 的插件也会列出。
- **来源标记**：`仅主页面`、`主页面+侧栏`、`仅侧栏`、`系统`。仅有侧栏、没有主页面的条目标为“不可打开”，不能分配。
- **管理器三页签**：
  - **文件夹**：新建 / 重命名 / 删除 / 上移下移；卡片显示成员数与徽标。
  - **全部入口**：搜索；每行下拉选择文件夹（键盘通道）；拖到文件夹 chip（鼠标通道）；选「未分类」移出。
  - **总设置**：表格多选、批量移动、批量移出、清理失效/不可打开项。
- **文件夹页**：「编辑成员」右侧抽屉（搜索 / 全选 / 清空 / 勾选保存 / 失效入口处理）；每行「移出」；点入口直达插件主页。
- **配置恢复**：配置文件损坏时，管理器错误页提供「备份并重置配置」；先复制备份再写默认配置。
- **持久化**：配置写入 `$DSH_HOME/plugin-entry-manager/config.json`，原子写、覆盖前备份（最近 3 份）、`revision` 乐观锁。

## 交互约定

- **点文件夹文字** = 进入文件夹页。
- **点文件夹图标 / 右下角小箭头** = 展开侧栏成员树。
- 折叠成 56px 轨道时只剩图标，因此折叠栏里点图标是展开树，树底部有「打开文件夹页」。
- 本插件**不隐藏、不移动、不重注册**其他插件的原生左栏行；是否还有原生行由插件自己决定。
- SurfCore 目前已经移除自己的左栏注册，只保留主页面 `surfcore-console`，因此它只从 PEM 的文件夹/成员树进入。

## 安装

### 从 GitHub 安装

仓库根目录就是本包，**不需要构建**：`client.js` 是可直接加载的成品。

- 图形界面：**插件** → **添加插件**，填 `github:<用户名>/plugin-entry-manager#v0.1.0`，安装后**完全重启 DSH**。
- 命令行：

```bash
dsh plugin --profile desktop add "github:<用户名>/plugin-entry-manager#v0.1.0"
```

`#v0.1.0` 是发布标签；不带标签会跟默认分支的最新提交，升级时显式换标签更可控。安装后 DSH 会把这个组合包自动加入 profile 的 `bundles`，不需要手改配置。

### 本地开发（link 安装）

在 profile 的 `package.json` 中：

```json
{
  "dependencies": {
    "@local/plugin-entry-manager": "link:<本机插件目录>"
  },
  "dsh": {
    "profile": {
      "bundles": ["@local/plugin-entry-manager"]
    }
  }
}
```

然后完全重启 DSH。客户端 bundle 在安装版下不保证热更，改动后通常需要「应用 → 退出」再打开。

## 数据与恢复

- 配置：`$DSH_HOME/plugin-entry-manager/config.json`
- 备份：同目录 `config.json.bak-<时间戳>`，最多保留 3 份
- 重置备份：`config.json.reset-<时间戳>`
- 损坏恢复：管理器错误页「备份并重置配置」（两步确认）
- 不写插件目录，不写 session，不读写插件启用状态

数据结构（v1）：

```json
{
  "version": 1,
  "revision": 7,
  "updatedAt": "2026-11-17T12:00:00.000Z",
  "folders": [
    {
      "id": "f_example",
      "name": "插件系列一",
      "color": "blue",
      "order": 0,
      "collapsed": false,
      "entries": ["audio-mixer"]
    }
  ],
  "settings": {
    "showManagerEntry": true,
    "showFolderEntries": true,
    "folderClick": "page",
    "defaultTab": "folders"
  },
  "stale": {}
}
```

`settings` 当前为**预留字段**：管理器行始终显示、文件夹行始终显示、点击行为固定为“文字进页面 / 图标展开树”。后续要加全局开关时再把这些字段接上，不影响现有数据。

## 开发与测试

```bash
# 语法
node --check client.js
node --check index.js

# 测试（直接执行；不要用 node --test，当前沙箱不允许测试运行器 spawn 子进程）
node test/host-config.test.mjs
node test/host-routes.test.mjs
node test/client-runtime.test.mjs

# locale JSON 与 client 内嵌字典同步
node scripts/sync-locale.mjs
```

测试覆盖：配置归一化/去重/版本冲突/备份/损坏恢复/重置；HTTP health/GET/PUT/409/400/POST 重置/热重载路由重注册；客户端运行时注册与 dispose。

## 结构

| 文件 | 作用 |
| --- | --- |
| `index.js` | Host：配置读写、校验、原子写、备份、恢复、HTTP 路由 |
| `client.js` | Client：slot 注册、管理器/文件夹页/抽屉/侧栏树（无构建，`window.__ModuleLoader__`） |
| `scripts/sync-locale.mjs` | 从 `client.js` 提取字典写 `locale/*.json` |
| `locale/*.json` | 与客户端字典同步的中英文案 |
| `cordis.patch.yml` | 把本包插入 profile 树 |

## 已知限制

- DSH 原生侧栏入口是扁平列表，没有官方父子槽位；文件夹通过“文件夹行 + 文件夹页/锚定树”实现，不是把原生行搬进树里。
- PEM 不控制其他插件的原生左栏行；隐藏/移除原生行需要插件自己处理，PEM 只管理主页面入口。
- 仅有 `sidebar.panellist`、没有 `main` 的条目不能被 PEM 打开；会显示为“仅侧栏/不可打开”，只能清理。
- 主页面-only 条目没有侧栏 label 时，优先用 `main` 注册的 `label`，否则把 key 美化成显示名；系统页面（`plugins`、`schedules`）标记为“系统”。
- 侧栏锚定树是 portal 浮层，Esc/外点关闭；没有实现方向键在树内移动（鼠标与文件夹页可用）。
- 文件夹成员只在一个文件夹中；重复项在保存时由 host 去重（第一个文件夹优先）。
- 全局开关（显示管理器行/文件夹行、点击行为、默认页签）尚未接到 UI，字段预留。
- 失效/不可打开入口会保留在配置中，由用户显式清理，不静默删除。
- 安装版客户端改动需要重启 DSH 才能保证加载；开发时的 `dev:web` HMR 不覆盖本安装形态。
