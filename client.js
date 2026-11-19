/**
 * Client half of the plugin-entry-manager bundle.
 *
 * C3 运行时骨架：
 *   - 启动时读取 host 配置；
 *   - 管理器行/页立即注册，文件夹行/页按配置动态注册与反注册；
 *   - 订阅 sidebar.panellist，实时得到其他插件入口目录；
 *   - 暴露 save()/open() 给 C5+ 的编辑界面。
 *
 * 约定：不引用其他插件的 React 组件，只依赖 react 与 DSH 的 slots / layout / locale 服务。
 */
window.__ModuleLoader__.load({
  id: '@local/plugin-entry-manager',
  factory: (require) => {
    const React = require('react');
    const ReactDOM = require('react-dom');
    const h = React.createElement;
    const { useEffect, useRef, useState, useSyncExternalStore } = React;

    const NS = 'plugin-entry-manager';
    const MANAGER_ID = 'plugin-entry-manager';
    const FOLDER_PREFIX = 'pem-folder-';
    const MANAGER_ORDER = 900;
    const FOLDER_ORDER_BASE = 910;
    const API = '/plugin-entry-manager/api/config';
    const STYLE_ID = 'pem-style';

    const FOLDER_COLORS = {
      blue: '#4f7cff',
      green: '#2f9e6e',
      orange: '#d9822b',
      purple: '#8b5cf6',
      pink: '#d9538a',
      gray: '#7b8494',
    };

    const DICTIONARIES = {
      zh: {
        navLabel: '插件入口',
        title: '插件入口',
        kicker: 'PLUGIN ENTRY MANAGER',
        subtitle: '把插件入口收进文件夹；只改位置，不改插件启停。',
        loading: '正在读取入口配置…',
        errorTitle: '配置读取失败',
        retry: '重试',
        ready: '配置已连接',
        readyHint: '文件夹会出现在左侧栏；点开即可进入它的主页。',
        folderCount: '文件夹',
        entryCount: '入口',
        unfiledCount: '未分类',
        foldersTitle: '文件夹',
        unfiledTitle: '未分类入口',
        noFolders: '还没有文件夹',
        noFoldersHint: 'C5 接入新建与编辑后，这里会出现你的第一个文件夹。',
        noUnfiled: '所有入口都收进文件夹了。',
        noEntries: '这个文件夹还没有入口。',
        missing: '未注册',
        back: '返回插件入口',
        folderMissing: '文件夹不存在',
        folderMissingHint: '它可能已被删除。回到管理器重新选择。',
        openManager: '打开管理器',
        entriesInFolder: '个入口',
        managerNote: 'C5 起可新建/重命名/删除文件夹；成员编辑与批量移动在 C6–C8 接入。',
        untitledFolder: '未命名文件夹',
        refresh: '刷新',
        newFolder: '新建文件夹',
        createFolder: '新建文件夹',
        renameFolder: '重命名文件夹',
        deleteFolder: '删除文件夹',
        folderName: '文件夹名称',
        folderNamePlaceholder: '例如：插件系列一',
        color: '颜色',
        create: '创建',
        save: '保存',
        cancel: '取消',
        delete: '删除',
        rename: '重命名',
        moveUp: '上移',
        moveDown: '下移',
        confirmDeleteTitle: '删除文件夹',
        confirmDeleteBody: '删除「{name}」？文件夹里的入口不会被卸载，会回到未分类。',
        nameRequired: '请输入文件夹名称',
        nameTooLong: '名称最多 40 个字符',
        saving: '保存中…',
        deleteFailed: '删除失败',
        tabFolders: '文件夹',
        tabEntries: '全部入口',
        tabSettings: '总设置',
        allEntriesTitle: '全部入口',
        allEntriesHint: '把入口分配给文件夹，或移回未分类。',
        searchEntries: '搜索入口…',
        currentFolder: '所在文件夹',
        removeFromFolder: '移出文件夹',
        noResults: '没有匹配的入口',
        dragHint: '也可以把下方未分类入口拖到文件夹卡片上。',
        dropHere: '放到这里',
        settingsSoon: '批量分配、清理失效项与全局开关即将接入。',
        editMembers: '编辑成员',
        membersTitle: '编辑「{name}」成员',
        membersHint: '勾选要放进这个文件夹的入口；取消勾选即移出。',
        selectedCount: '已选 {n} 个',
        remove: '移出',
        selectAll: '全选',
        clearAll: '清空',
        noMembers: '还没有成员',
        missingEntries: '失效 / 不可打开的入口',
        saveMembers: '保存成员',
        close: '关闭',
        memberSaveFailed: '保存失败',
        settingsTitle: '总设置',
        settingsHint: '批量选择入口，统一移动到文件夹、移出，或清理失效项。',
        entryColumn: '入口',
        folderColumn: '文件夹',
        statusColumn: '状态',
        statusOk: '正常',
        statusMissing: '未注册',
        bulkSelected: '已选 {n} 项',
        bulkMoveTo: '移动到',
        bulkMove: '移动',
        bulkRemove: '移出文件夹',
        cleanupStale: '清理失效项',
        cleanupDone: '已清理 {n} 项',
        noStale: '没有失效项',
        selectAllVisible: '全选',
        clearSelection: '清空选择',
        settingsEmpty: '还没有可管理的入口',
        moveTargetPlaceholder: '选择文件夹',
        applyFailed: '操作失败',
        resetConfig: '备份并重置配置',
        resetConfirm: '再次点击确认重置',
        resetHint: '会先把当前配置复制一份备份，再恢复为空配置；不会卸载任何插件。',
        sourceMainOnly: '仅主页面',
        sourceBoth: '主页面+侧栏',
        sourceSidebarOnly: '仅侧栏',
        notOpenable: '不可打开',
        systemPage: '系统',
        treeTitle: '成员',
        openFolderPage: '打开文件夹页',
        treeEmpty: '还没有成员',
        expandMembers: '展开成员',
      },
      en: {
        navLabel: 'Plugin entries',
        title: 'Plugin entries',
        kicker: 'PLUGIN ENTRY MANAGER',
        subtitle: 'Group plugin entries into folders. Placement only; plugin enablement is untouched.',
        loading: 'Loading entry config…',
        errorTitle: 'Could not load config',
        retry: 'Retry',
        ready: 'Config connected',
        readyHint: 'Folders appear in the sidebar; click one to open its page.',
        folderCount: 'Folders',
        entryCount: 'Entries',
        unfiledCount: 'Unfiled',
        foldersTitle: 'Folders',
        unfiledTitle: 'Unfiled entries',
        noFolders: 'No folders yet',
        noFoldersHint: 'Creating and editing folders arrives in C5.',
        noUnfiled: 'Every entry is in a folder.',
        noEntries: 'This folder has no entries yet.',
        missing: 'Not registered',
        back: 'Back to plugin entries',
        folderMissing: 'Folder not found',
        folderMissingHint: 'It may have been deleted. Go back to the manager.',
        openManager: 'Open manager',
        entriesInFolder: 'entries',
        managerNote: 'C5 adds folder create/rename/delete; member editing and batch moves arrive in C6–C8.',
        untitledFolder: 'Untitled folder',
        refresh: 'Refresh',
        newFolder: 'New folder',
        createFolder: 'New folder',
        renameFolder: 'Rename folder',
        deleteFolder: 'Delete folder',
        folderName: 'Folder name',
        folderNamePlaceholder: 'e.g. Plugin series one',
        color: 'Color',
        create: 'Create',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        rename: 'Rename',
        moveUp: 'Move up',
        moveDown: 'Move down',
        confirmDeleteTitle: 'Delete folder',
        confirmDeleteBody: 'Delete “{name}”? Its entries are not uninstalled; they return to Unfiled.',
        nameRequired: 'Enter a folder name',
        nameTooLong: 'Name must be 40 characters or fewer',
        saving: 'Saving…',
        deleteFailed: 'Delete failed',
        tabFolders: 'Folders',
        tabEntries: 'All entries',
        tabSettings: 'Settings',
        allEntriesTitle: 'All entries',
        allEntriesHint: 'Assign an entry to a folder, or send it back to Unfiled.',
        searchEntries: 'Search entries…',
        currentFolder: 'Folder',
        removeFromFolder: 'Remove from folder',
        noResults: 'No matching entries',
        dragHint: 'You can also drag an unfiled entry onto a folder card.',
        dropHere: 'Drop here',
        settingsSoon: 'Batch assignment, stale cleanup, and global toggles arrive next.',
        editMembers: 'Edit members',
        membersTitle: 'Edit members of “{name}”',
        membersHint: 'Check entries to keep in this folder; uncheck to remove.',
        selectedCount: '{n} selected',
        remove: 'Remove',
        selectAll: 'Select all',
        clearAll: 'Clear',
        noMembers: 'No members yet',
        missingEntries: 'Missing / not openable entries',
        saveMembers: 'Save members',
        close: 'Close',
        memberSaveFailed: 'Save failed',
        settingsTitle: 'Settings',
        settingsHint: 'Select entries to move, remove, or clean up missing ones.',
        entryColumn: 'Entry',
        folderColumn: 'Folder',
        statusColumn: 'Status',
        statusOk: 'OK',
        statusMissing: 'Missing',
        bulkSelected: '{n} selected',
        bulkMoveTo: 'Move to',
        bulkMove: 'Move',
        bulkRemove: 'Remove from folder',
        cleanupStale: 'Clean up missing',
        cleanupDone: 'Cleaned {n}',
        noStale: 'No missing entries',
        selectAllVisible: 'Select all',
        clearSelection: 'Clear selection',
        settingsEmpty: 'No entries to manage yet',
        moveTargetPlaceholder: 'Choose a folder',
        applyFailed: 'Operation failed',
        resetConfig: 'Back up and reset',
        resetConfirm: 'Click again to confirm reset',
        resetHint: 'Copies the current config to a backup, then restores an empty config. No plugin is uninstalled.',
        sourceMainOnly: 'Main only',
        sourceBoth: 'Main + sidebar',
        sourceSidebarOnly: 'Sidebar only',
        notOpenable: 'Not openable',
        systemPage: 'System',
        treeTitle: 'Members',
        openFolderPage: 'Open folder page',
        treeEmpty: 'No members yet',
        expandMembers: 'Expand members',
      },
    };

    let localeRef = null;

    function currentDictionary() {
      const tag = localeRef?.getSnapshot?.().locale ?? 'en';
      const normalized = String(tag).toLowerCase().split(/[-_]/)[0];
      return DICTIONARIES[tag] ?? DICTIONARIES[normalized] ?? DICTIONARIES.en;
    }

    function useT() {
      const [tick, setTick] = useState(0);
      useEffect(() => {
        if (!localeRef?.subscribe) return undefined;
        return localeRef.subscribe(() => setTick((n) => n + 1));
      }, []);
      void tick;
      const dict = currentDictionary();
      return (key) => dict[key] ?? DICTIONARIES.en[key] ?? key;
    }

    function ensureStyles() {
      if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
.pem-page {
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: max(24px, calc(var(--dsh-frame-top-clearance, 0px) + 16px)) 24px 48px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #1f2328);
}
.pem-wrap { width: min(980px, 100%); margin: 0 auto; }
.pem-kicker {
  font-size: 11px;
  letter-spacing: .14em;
  font-weight: 600;
  color: var(--dsw-alias-label-secondary, #5b6472);
  opacity: .8;
}
.pem-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 16px; }
.pem-title { margin: 8px 0 6px; font-size: 26px; line-height: 1.2; font-weight: 650; letter-spacing: -.01em; }
.pem-subtitle { margin: 0; max-width: 680px; font-size: 13px; line-height: 1.65; color: var(--dsw-alias-label-secondary, #5b6472); }
.pem-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 14px; font-size: 12px; color: var(--dsw-alias-label-secondary, #5b6472); }
.pem-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 9px; border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
  background: var(--dsw-alias-bg-layer-2, #f6f7f9);
}
.pem-pill b { font-weight: 600; color: var(--dsw-alias-label-primary, #1f2328); }
.pem-dot { width: 6px; height: 6px; border-radius: 50%; background: #2f9e6e; }
.pem-tabbar {
  display: flex; gap: 4px; margin-top: 18px; padding-bottom: 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
  overflow-x: auto;
}
.pem-tab {
  border: 0; background: transparent; color: var(--dsw-alias-label-secondary, #5b6472);
  padding: 6px 10px; border-radius: 8px; font: inherit; font-size: 13px; cursor: pointer;
}
.pem-tab:hover { background: var(--dsw-alias-bg-layer-2, #f6f7f9); color: var(--dsw-alias-label-primary, #1f2328); }
.pem-tab[aria-selected='true'] {
  background: var(--dsw-alias-bg-layer-2, #f6f7f9);
  color: var(--dsw-alias-label-primary, #1f2328);
  font-weight: 600;
}
.pem-toolbar { display: flex; gap: 10px; align-items: center; margin: 16px 0 10px; }
.pem-search {
  flex: 1; min-width: 0; box-sizing: border-box; padding: 7px 10px;
  border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #1f2328); font: inherit; font-size: 13px;
}
.pem-search:focus { outline: 2px solid var(--dsw-alias-brand-primary, #4f7cff); outline-offset: 1px; }
.pem-assign-row { cursor: default; }
.pem-assign-row[draggable='true'] { cursor: grab; }
.pem-assign-row .pem-row-main { flex: 1; }
.pem-select {
  max-width: 170px; min-width: 110px; box-sizing: border-box;
  padding: 5px 7px; border-radius: 7px;
  border: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #1f2328); font: inherit; font-size: 12px;
}
.pem-drop-target { outline: 2px dashed var(--dsw-alias-brand-primary, #4f7cff); outline-offset: 2px; }
.pem-drop-hint { margin-top: 8px; font-size: 11px; color: var(--dsw-alias-label-secondary, #5b6472); }
.pem-folder-rail { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 12px; }
.pem-folder-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 9px; border-radius: 999px; font-size: 12px;
  border: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
  background: var(--dsw-alias-bg-layer-2, #f6f7f9);
  color: var(--dsw-alias-label-primary, #1f2328);
}
.pem-folder-glyph {
  position: relative; display: inline-flex; align-items: center; justify-content: center;
  width: 100%; height: 100%;
}
.pem-tree-toggle {
  position: absolute; right: -5px; bottom: -5px;
  width: 12px; height: 12px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-secondary, #5b6472);
  font-size: 9px; line-height: 1; cursor: pointer; opacity: .8;
}
.pem-folder-glyph:hover .pem-tree-toggle { opacity: 1; }
.pem-tree-backdrop { position: fixed; inset: 0; z-index: 1100; background: transparent; }
.pem-tree {
  position: fixed; z-index: 1101; width: 220px; max-height: 340px; overflow: auto;
  padding: 6px; border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #1f2328);
  box-shadow: 0 12px 32px rgba(15, 23, 42, .2);
}
.pem-tree-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 4px 8px 6px; font-size: 11px; color: var(--dsw-alias-label-secondary, #5b6472);
}
.pem-tree-item {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 6px 8px; border: 0; border-radius: 7px; background: transparent;
  color: inherit; font: inherit; font-size: 12px; text-align: left; cursor: pointer;
}
.pem-tree-item:hover { background: var(--dsw-alias-bg-layer-2, #f6f7f9); }
.pem-tree-item:disabled { opacity: .5; cursor: default; }
.pem-tree-empty { padding: 14px 8px; text-align: center; font-size: 12px; color: var(--dsw-alias-label-secondary, #5b6472); }
.pem-tree-foot { margin-top: 4px; padding-top: 4px; border-top: 1px solid var(--dsw-alias-border-l2, #d0d5dd); }
.pem-section { margin-top: 28px; }
.pem-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.pem-section-title { margin: 0; font-size: 14px; font-weight: 600; }
.pem-section-hint { font-size: 12px; color: var(--dsw-alias-label-secondary, #5b6472); }
.pem-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.pem-folder-card {
  display: flex; flex-direction: column;
  width: 100%; border-radius: 12px; overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
  background: var(--dsw-alias-bg-layer-2, #f6f7f9);
  color: var(--dsw-alias-label-primary, #1f2328);
}
.pem-folder-card:hover { border-color: var(--dsw-alias-label-tertiary, #98a1b0); }
.pem-folder-card:focus-within { border-color: var(--dsw-alias-brand-primary, #4f7cff); }
.pem-folder-main {
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
  width: 100%; padding: 14px; border: 0; background: transparent;
  color: inherit; font: inherit; text-align: left; cursor: pointer;
}
.pem-folder-main:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #4f7cff); outline-offset: -2px; }
.pem-folder-actions { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 12px 11px; }
.pem-folder-top { display: flex; align-items: center; gap: 9px; width: 100%; }
.pem-icon-btn, .pem-text-btn {
  border: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-secondary, #5b6472);
  border-radius: 7px; padding: 3px 8px; font: inherit; font-size: 11px; cursor: pointer;
}
.pem-icon-btn { min-width: 24px; padding: 3px 6px; }
.pem-icon-btn:hover, .pem-text-btn:hover { color: var(--dsw-alias-label-primary, #1f2328); background: var(--dsw-alias-bg-layer-2, #f6f7f9); }
.pem-icon-btn:disabled, .pem-text-btn:disabled { opacity: .4; cursor: default; }
.pem-text-btn.danger { color: var(--dsw-alias-label-danger, #a4262c); }
.pem-btn-primary {
  background: var(--dsw-alias-brand-primary, #1f6feb);
  border-color: var(--dsw-alias-brand-primary, #1f6feb);
  color: #ffffff;
}
.pem-btn-primary:hover { background: var(--dsw-alias-brand-primary-hover, #175dcf); color: #ffffff; }
.pem-btn-danger { background: #c0392b; border-color: #c0392b; color: #ffffff; }
.pem-btn-danger:hover { background: #a93226; color: #ffffff; }
.pem-modal-backdrop {
  position: fixed; inset: 0; z-index: 1200;
  display: flex; align-items: center; justify-content: center;
  padding: 24px; background: rgba(15, 23, 42, .38);
}
.pem-modal {
  width: min(420px, 100%); box-sizing: border-box;
  padding: 20px; border-radius: 14px;
  border: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #1f2328);
  box-shadow: 0 18px 48px rgba(15, 23, 42, .22);
}
.pem-modal-title { margin: 0 0 6px; font-size: 16px; font-weight: 650; }
.pem-modal-desc { margin: 0 0 14px; font-size: 12px; line-height: 1.65; color: var(--dsw-alias-label-secondary, #5b6472); }
.pem-field { margin-bottom: 14px; }
.pem-label { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 550; }
.pem-input {
  width: 100%; box-sizing: border-box; padding: 8px 10px;
  border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
  background: var(--dsw-alias-bg-layer-2, #f6f7f9);
  color: var(--dsw-alias-label-primary, #1f2328);
  font: inherit; font-size: 13px;
}
.pem-input:focus { outline: 2px solid var(--dsw-alias-brand-primary, #4f7cff); outline-offset: 1px; }
.pem-colors { display: flex; gap: 8px; flex-wrap: wrap; }
.pem-swatch {
  width: 24px; height: 24px; padding: 0; border-radius: 50%; cursor: pointer;
  border: 2px solid transparent;
}
.pem-swatch[aria-pressed='true'] { border-color: var(--dsw-alias-label-primary, #1f2328); box-shadow: inset 0 0 0 2px var(--dsw-alias-bg-layer-1, #fff); }
.pem-modal-error { margin: 0 0 10px; font-size: 12px; color: var(--dsw-alias-label-danger, #a4262c); }
.pem-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
.pem-foot { margin-top: 26px; font-size: 11px; color: var(--dsw-alias-label-secondary, #5b6472); opacity: .75; }
.pem-folder-name { font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pem-folder-meta { font-size: 12px; color: var(--dsw-alias-label-secondary, #5b6472); }
.pem-folder-badges { display: flex; gap: 5px; flex-wrap: wrap; }
.pem-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 8px;
  font-size: 12px; font-weight: 600;
  background: var(--dsw-alias-bg-layer-3, #eceff3);
  color: var(--dsw-alias-label-secondary, #5b6472);
}
.pem-list { display: flex; flex-direction: column; gap: 6px; }
.pem-row {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 9px 11px; border-radius: 10px; text-align: left; cursor: pointer;
  border: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #1f2328);
  font: inherit;
}
.pem-row:hover { background: var(--dsw-alias-bg-layer-2, #f6f7f9); }
.pem-row:disabled { cursor: default; opacity: .55; }
.pem-row-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.pem-row-label { font-size: 13px; font-weight: 550; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pem-row-id { font-size: 11px; color: var(--dsw-alias-label-secondary, #5b6472); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pem-row-state { margin-left: auto; font-size: 11px; color: var(--dsw-alias-label-secondary, #5b6472); }
.pem-source {
  display: inline-flex; align-items: center; flex: none;
  padding: 2px 6px; border-radius: 999px; font-size: 10px; line-height: 14px;
  border: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
  color: var(--dsw-alias-label-secondary, #5b6472);
  background: var(--dsw-alias-bg-layer-2, #f6f7f9);
}
.pem-folder-entry {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 8px 4px 4px; border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
  background: var(--dsw-alias-bg-layer-1, #ffffff);
}
.pem-entry-open {
  flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px;
  padding: 5px 7px; border: 0; border-radius: 8px; background: transparent;
  color: inherit; font: inherit; text-align: left; cursor: pointer;
}
.pem-entry-open:hover { background: var(--dsw-alias-bg-layer-2, #f6f7f9); }
.pem-entry-open:disabled { opacity: .55; cursor: default; }
.pem-drawer-backdrop {
  position: fixed; inset: 0; z-index: 1150;
  display: flex; justify-content: flex-end;
  background: rgba(15, 23, 42, .32);
}
.pem-drawer {
  width: min(440px, 100%); height: 100%; box-sizing: border-box;
  display: flex; flex-direction: column;
  padding: 18px; border-left: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #1f2328);
  box-shadow: -12px 0 40px rgba(15, 23, 42, .16);
}
.pem-drawer-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.pem-drawer-title { margin: 0 0 6px; font-size: 16px; font-weight: 650; }
.pem-drawer-body { flex: 1; min-height: 0; overflow: auto; margin: 14px 0; }
.pem-drawer-foot {
  display: flex; justify-content: flex-end; gap: 8px;
  padding-top: 12px; border-top: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
}
.pem-check-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; margin-bottom: 6px; border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  cursor: pointer;
}
.pem-check-row:hover { background: var(--dsw-alias-bg-layer-2, #f6f7f9); }
.pem-check-row input { accent-color: var(--dsw-alias-brand-primary, #4f7cff); }
.pem-check-row .pem-row-main { flex: 1; }
.pem-drawer-section { margin: 16px 0 8px; font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-secondary, #5b6472); }
.pem-drawer-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; }
.pem-drawer-toolbar .pem-search { flex: 1; }
.pem-table { border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); border-radius: 10px; overflow-x: auto; }
.pem-table-head, .pem-table-row {
  display: grid; grid-template-columns: 28px minmax(0, 1fr) 150px 76px;
  gap: 8px; align-items: center; padding: 8px 10px; min-width: 520px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
}
.pem-table-head {
  background: var(--dsw-alias-bg-layer-2, #f6f7f9);
  font-size: 11px; font-weight: 600; color: var(--dsw-alias-label-secondary, #5b6472);
}
.pem-table-row:last-child { border-bottom: 0; }
.pem-table-row:hover { background: var(--dsw-alias-bg-layer-2, #f6f7f9); }
.pem-table-entry { display: flex; align-items: center; gap: 8px; min-width: 0; }
.pem-table-entry .pem-row-main { min-width: 0; }
.pem-table-row.missing { opacity: .7; }
.pem-status { font-size: 11px; color: var(--dsw-alias-label-secondary, #5b6472); }
.pem-status.missing { color: var(--dsw-alias-label-danger, #a4262c); }
.pem-bulkbar {
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
  margin: 10px 0; padding: 10px; border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
  background: var(--dsw-alias-bg-layer-2, #f6f7f9);
}
.pem-bulkbar .pem-select { min-width: 140px; }
@media (max-width: 720px) {
  .pem-page { padding-left: 16px; padding-right: 16px; }
  .pem-title { font-size: 22px; }
  .pem-head { gap: 10px; }
  .pem-table-head, .pem-table-row { grid-template-columns: 26px minmax(0, 1fr) 128px 64px; }
  .pem-drawer { width: 100%; }
}
.pem-empty {
  border: 1px dashed var(--dsw-alias-border-l2, #d0d5dd);
  border-radius: 12px; padding: 22px; text-align: center;
  color: var(--dsw-alias-label-secondary, #5b6472); font-size: 13px; line-height: 1.7;
}
.pem-empty b { display: block; color: var(--dsw-alias-label-primary, #1f2328); font-size: 14px; margin-bottom: 4px; }
.pem-error {
  border: 1px solid var(--dsw-alias-border-danger, #d9534f);
  background: var(--dsw-alias-bg-danger, #fff2f0);
  color: var(--dsw-alias-label-danger, #a4262c);
  border-radius: 12px; padding: 16px; font-size: 13px; line-height: 1.6;
}
.pem-btn {
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid var(--dsw-alias-border-l2, #d0d5dd);
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #1f2328);
  border-radius: 8px; padding: 6px 11px; font-size: 12px; cursor: pointer;
}
.pem-btn:hover { background: var(--dsw-alias-bg-layer-2, #f6f7f9); }
.pem-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #4f7cff); outline-offset: 2px; }
.pem-back {
  display: inline-flex; align-items: center; gap: 6px;
  border: 0; background: transparent; padding: 4px 0; margin-bottom: 10px;
  color: var(--dsw-alias-label-secondary, #5b6472); font-size: 12px; cursor: pointer;
}
.pem-back:hover { color: var(--dsw-alias-label-primary, #1f2328); }
.pem-loading { display: flex; align-items: center; gap: 10px; padding: 28px 0; font-size: 13px; color: var(--dsw-alias-label-secondary, #5b6472); }
.pem-spinner {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid var(--dsw-alias-border-l2, #d0d5dd);
  border-top-color: var(--dsw-alias-brand-primary, #4f7cff);
  animation: pem-spin .8s linear infinite;
}
@keyframes pem-spin { to { transform: rotate(360deg); } }
.pem-foot { margin-top: 26px; font-size: 11px; color: var(--dsw-alias-label-secondary, #5b6472); opacity: .75; }
`;
      document.head.appendChild(style);
    }

    function initials(label) {
      const text = String(label ?? '').trim();
      if (!text) return '?';
      const first = Array.from(text)[0];
      return first.toUpperCase();
    }

    function hashColor(id) {
      const palette = Object.values(FOLDER_COLORS);
      let hash = 0;
      for (const char of String(id)) hash = (hash * 31 + char.charCodeAt(0)) % 997;
      return palette[hash % palette.length];
    }

    function FolderGlyph({ size = 18, color }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': 'true',
          focusable: 'false',
          style: color ? { color, flex: '0 0 auto' } : { flex: '0 0 auto' },
        },
        h('path', {
          d: 'M3.5 7.2c0-1 .8-1.7 1.7-1.7h4l1.7 2h8c1 0 1.7.8 1.7 1.7v8.1c0 1-.8 1.7-1.7 1.7H5.2c-1 0-1.7-.8-1.7-1.7V7.2Z',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M8 13.2h8M8 16.2h5',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          opacity: 0.75,
        }),
      );
    }

    function Badge({ label, color }) {
      return h(
        'span',
        {
          className: 'pem-badge',
          style: color ? { color, background: `${color}1f` } : undefined,
          'aria-hidden': 'true',
        },
        initials(label),
      );
    }

    function SourceTag({ panel }) {
      const t = useT();
      if (!panel) return null;
      if (!panel.hasMain) {
        return h(
          'span',
          { className: 'pem-source' },
          panel.missing ? t('notOpenable') : t('sourceSidebarOnly'),
        );
      }
      if (panel.system) return h('span', { className: 'pem-source' }, t('systemPage'));
      return h('span', { className: 'pem-source' }, panel.hasSidebar ? t('sourceBoth') : t('sourceMainOnly'));
    }

    /**
     * 侧栏文件夹图标：图标本身展开锚定成员树；行内文字仍由 PanelRow 处理（打开文件夹页）。
     * 浮层通过 react-dom portal 挂到 body，避免嵌在 <button> 里造成交互嵌套。
     */
    function FolderEntryIcon({ folderId, size = 18, active }) {
      const t = useT();
      const snap = useRuntime();
      const [open, setOpen] = useState(false);
      const [pos, setPos] = useState({ left: 0, top: 0 });
      const folder = snap.config?.folders?.find((item) => item.id === folderId);
      const entries = folder ? runtime.folderEntries(folder) : [];

      useEffect(() => {
        if (!open) return undefined;
        const onKey = (event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
          }
        };
        const close = () => setOpen(false);
        window.addEventListener('keydown', onKey);
        window.addEventListener('resize', close);
        window.addEventListener('scroll', close, true);
        return () => {
          window.removeEventListener('keydown', onKey);
          window.removeEventListener('resize', close);
          window.removeEventListener('scroll', close, true);
        };
      }, [open]);

      function toggle(event) {
        event.preventDefault();
        event.stopPropagation();
        if (open) {
          setOpen(false);
          return;
        }
        const row = event.currentTarget.closest('button');
        const rect = (row ?? event.currentTarget).getBoundingClientRect();
        const width = 220;
        const left = Math.min(Math.max(8, rect.right + 8), window.innerWidth - width - 8);
        const top = Math.min(Math.max(8, rect.top - 6), window.innerHeight - 348);
        setPos({ left, top });
        setOpen(true);
      }

      const treeContent = open
        ? h(
            React.Fragment,
            null,
            h('div', { className: 'pem-tree-backdrop', onMouseDown: () => setOpen(false) }),
            h(
              'div',
              {
                className: 'pem-tree',
                style: { left: pos.left, top: pos.top },
                role: 'menu',
                'aria-label': folder?.name ?? '',
                onMouseDown: (event) => event.stopPropagation(),
                onClick: (event) => event.stopPropagation(),
              },
              h(
                'div',
                { className: 'pem-tree-head' },
                h('span', null, folder?.name ?? ''),
                h('span', null, t('treeTitle')),
              ),
              entries.length === 0
                ? h('div', { className: 'pem-tree-empty' }, t('treeEmpty'))
                : entries.map((panel) =>
                    h(
                      'button',
                      {
                        key: panel.id,
                        type: 'button',
                        role: 'menuitem',
                        className: 'pem-tree-item',
                        disabled: panel.missing,
                        onClick: () => {
                          setOpen(false);
                          if (!panel.missing) runtime.openEntry(panel.id);
                        },
                      },
                      h(Badge, {
                        label: panel.label,
                        color: panel.missing ? undefined : hashColor(panel.id),
                      }),
                      h(
                        'span',
                        { className: 'pem-row-label', style: { flex: 1 } },
                        panel.label || panel.id,
                      ),
                      panel.missing ? h('span', { className: 'pem-row-state' }, t('missing')) : null,
                    ),
                  ),
              h(
                'div',
                { className: 'pem-tree-foot' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'pem-tree-item',
                    onClick: () => {
                      setOpen(false);
                      runtime.openFolder(folderId);
                    },
                  },
                  t('openFolderPage'),
                ),
              ),
            ),
          )
        : null;

      // 共享模块表里正常有 react-dom；若部署环境缺失，退回内联 fixed 浮层而不是直接崩掉。
      const tree =
        treeContent === null
          ? null
          : typeof ReactDOM?.createPortal === 'function'
            ? ReactDOM.createPortal(treeContent, document.body)
            : treeContent;

      return h(
        'span',
        {
          className: 'pem-folder-glyph',
          title: t('expandMembers'),
          onClick: toggle,
          onMouseDown: (event) => event.stopPropagation(),
        },
        h(FolderGlyph, { size, active, color: folder ? FOLDER_COLORS[folder.color] : undefined }),
        h(
          'span',
          {
            className: 'pem-tree-toggle',
            role: 'button',
            tabIndex: -1,
            'aria-label': t('expandMembers'),
            onMouseDown: (event) => event.stopPropagation(),
          },
          '▸',
        ),
        tree,
      );
    }

    /* ------------------------------------------------------------------ */
    /* Runtime                                                              */
    /* ------------------------------------------------------------------ */

    let runtimeCtx = null;
    const folderRegs = new Map();

    const runtime = (() => {
      let state = { status: 'idle', config: null, panels: [], error: null };
      const listeners = new Set();
      let offSlots = null;
      let offMain = null;
      let offLocale = null;
      let abort = null;
      let refreshing = false;
      let saving = false;
      let onVisibility = null;

      function emit() {
        for (const listener of [...listeners]) listener();
      }

      function set(patch) {
        state = { ...state, ...patch };
        emit();
      }

      function subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }

      function getSnapshot() {
        return state;
      }

      function resolveLabel(label, fallback) {
        try {
          if (typeof label === 'string' && label.trim()) return label;
          if (typeof label === 'function') {
            const value = label();
            if (typeof value === 'string' && value.trim()) return value;
          }
          if (label && typeof label === 'object') {
            const tag = runtimeCtx?.locale?.getSnapshot?.().locale;
            for (const key of [tag, 'zh', 'en', 'default']) {
              if (key && typeof label[key] === 'string' && label[key].trim()) return label[key];
            }
          }
        } catch {
          /* 标签解析失败时回退到 id */
        }
        return fallback;
      }

      function prettifyKey(key) {
        const text = String(key)
          .replace(/[-_./:]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return text ? text.replace(/\b\w/g, (char) => char.toUpperCase()) : String(key);
      }

      /**
       * 入口目录以 main.key 为准：即使插件没有 sidebar.panellist 行，只要注册了主页面，
       * 也能被 PEM 发现。侧栏行只作为 label/order 的补充；仅有侧栏、没有 main 的旧项
       * 保留为“不可打开”，避免配置里已有条目突然消失。
       */
      function refreshPanels() {
        if (!runtimeCtx) return;
        const sideEntries = (() => {
          try {
            return runtimeCtx.slots.entriesOfSlot('sidebar.panellist') ?? [];
          } catch {
            return [];
          }
        })();
        const mainEntries = (() => {
          try {
            return runtimeCtx.slots.entriesOfSlot('main') ?? [];
          } catch {
            return [];
          }
        })();
        const sideById = new Map();
        for (const entry of sideEntries) {
          const options = entry?.options ?? {};
          const id = options.id;
          if (typeof id !== 'string' || !id) continue;
          if (id === MANAGER_ID || id.startsWith(FOLDER_PREFIX)) continue;
          sideById.set(id, options);
        }

        const seen = new Set();
        const panels = [];
        for (const entry of mainEntries) {
          const options = entry?.options ?? {};
          const key = options.key;
          if (typeof key !== 'string' || !key) continue;
          if (key === 'conversation' || key === MANAGER_ID || key.startsWith(FOLDER_PREFIX)) continue;
          if (seen.has(key)) continue;
          seen.add(key);
          const side = sideById.get(key);
          panels.push({
            id: key,
            label: side
              ? resolveLabel(side.label, prettifyKey(key))
              : resolveLabel(options.label, prettifyKey(key)),
            order: side ? Number(side.order) || 0 : 1000,
            hasMain: true,
            hasSidebar: Boolean(side),
            system: key === 'plugins' || key === 'schedules',
          });
        }

        for (const [id, options] of sideById) {
          if (seen.has(id)) continue;
          seen.add(id);
          panels.push({
            id,
            label: resolveLabel(options.label, prettifyKey(id)),
            order: Number(options.order) || 0,
            hasMain: false,
            hasSidebar: true,
            system: false,
          });
        }

        panels.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
        set({ panels });
      }

      function folderName(id) {
        const folder = state.config?.folders?.find((item) => item.id === id);
        return folder?.name || 'Folder';
      }

      function folderColor(id) {
        const folder = state.config?.folders?.find((item) => item.id === id);
        return FOLDER_COLORS[folder?.color] ?? FOLDER_COLORS.blue;
      }

      function activePanelId() {
        try {
          return runtimeCtx?.layout?.panelInfo?.getSnapshot?.().activePanelId ?? null;
        } catch {
          return null;
        }
      }

      function registerFolder(folder, order) {
        const ctx = runtimeCtx;
        const key = `${FOLDER_PREFIX}${folder.id}`;
        const disposePage = ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key }, () => h(FolderPage, { folderId: folder.id })),
        );
        const disposeRow = ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            { name: 'sidebar.panellist', id: key, order, label: () => folderName(folder.id) },
            (props) => h(FolderEntryIcon, { ...props, folderId: folder.id }),
          ),
        );
        return {
          order,
          name: folder.name,
          color: folder.color,
          dispose() {
            try {
              disposeRow();
            } finally {
              disposePage();
            }
          },
        };
      }

      function syncFolders() {
        if (!runtimeCtx) return;
        const folders = state.config?.folders ?? [];
        const wanted = new Set(folders.map((folder) => folder.id));

        for (const [id, registration] of [...folderRegs]) {
          if (wanted.has(id)) continue;
          const key = `${FOLDER_PREFIX}${id}`;
          if (activePanelId() === key) {
            try {
              runtimeCtx.layout?.selectPanel?.(MANAGER_ID);
            } catch {
              /* 管理器页应始终存在 */
            }
          }
          registration.dispose();
          folderRegs.delete(id);
        }

        folders.forEach((folder, index) => {
          const order = FOLDER_ORDER_BASE + index;
          const existing = folderRegs.get(folder.id);
          if (!existing) {
            folderRegs.set(folder.id, registerFolder(folder, order));
            return;
          }
          if (existing.order !== order || existing.name !== folder.name || existing.color !== folder.color) {
            existing.dispose();
            folderRegs.set(folder.id, registerFolder(folder, order));
          }
        });
      }

      async function start() {
        if (!runtimeCtx) return;
        if (state.status === 'loading') return;
        if (state.status === 'ready') {
          // 插件热重载时模块可能被复用（state 还在），不要直接 return，否则会停留在旧配置。
          await refresh();
          return;
        }
        abort?.abort();
        abort = new AbortController();
        set({ status: 'loading', error: null });
        refreshPanels();

        if (!offSlots) {
          offSlots = runtimeCtx.slots.subscribe('sidebar.panellist', refreshPanels);
        }
        if (!offMain) {
          try {
            offMain = runtimeCtx.slots.subscribe('main', refreshPanels) ?? (() => {});
          } catch {
            // 极旧宿主可能没有 keyed slot 订阅；仍保留启动时的一次性扫描。
            offMain = () => {};
          }
        }
        if (!offLocale) {
          offLocale = runtimeCtx.locale.subscribe(() => {
            refreshPanels();
            emit();
          });
        }
        if (!onVisibility && typeof window !== 'undefined' && typeof document !== 'undefined') {
          onVisibility = () => {
            if (document.visibilityState === 'visible') refresh();
          };
          window.addEventListener('focus', onVisibility);
          document.addEventListener('visibilitychange', onVisibility);
        }

        try {
          const response = await fetch(API, {
            headers: { accept: 'application/json' },
            signal: abort.signal,
            cache: 'no-store',
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
          }
          set({ status: 'ready', config: data.config, error: null });
          syncFolders();
        } catch (error) {
          if (error?.name === 'AbortError') return;
          set({ status: 'error', error: String(error?.message ?? error) });
        }
      }

      /**
       * 重新拉取配置：窗口重新聚焦、回到管理器页、以及手动刷新时调用。
       * 外部窗口或 host 改了配置时，不重启也能追上。
       */
      async function refresh() {
        if (!runtimeCtx || refreshing || saving || state.status === 'loading') return;
        refreshing = true;
        try {
          const response = await fetch(API, {
            headers: { accept: 'application/json' },
            cache: 'no-store',
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
          }
          if (!runtimeCtx) return;
          set({ status: 'ready', config: data.config, error: null });
          refreshPanels();
          syncFolders();
        } catch (error) {
          if (!runtimeCtx) return;
          if (state.config) set({ error: String(error?.message ?? error) });
          else set({ status: 'error', error: String(error?.message ?? error) });
        } finally {
          refreshing = false;
        }
      }

      function stop() {
        abort?.abort();
        abort = null;
        if (offSlots) {
          offSlots();
          offSlots = null;
        }
        if (offMain) {
          offMain();
          offMain = null;
        }
        if (offLocale) {
          offLocale();
          offLocale = null;
        }
        if (onVisibility) {
          window.removeEventListener('focus', onVisibility);
          document.removeEventListener('visibilitychange', onVisibility);
          onVisibility = null;
        }
        for (const registration of folderRegs.values()) registration.dispose();
        folderRegs.clear();
        runtimeCtx = null;
        set({ status: 'idle', config: null, panels: [], error: null });
      }

      function retry() {
        if (state.status !== 'error') return;
        abort?.abort();
        set({ status: 'idle', error: null });
        start();
      }

      async function reset() {
        if (!runtimeCtx) throw new Error('配置尚未加载');
        try {
          const response = await fetch(API, {
            method: 'POST',
            headers: { accept: 'application/json' },
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
          }
          set({ status: 'ready', config: data.config, error: null });
          syncFolders();
          return data.config;
        } catch (error) {
          set({ status: 'error', error: String(error?.message ?? error) });
          throw error;
        }
      }

      async function save(nextConfig) {
        if (!runtimeCtx || !state.config) throw new Error('配置尚未加载');
        saving = true;
        const previous = state.config;
        const revision = previous.revision;
        const optimistic = { ...nextConfig, revision };
        set({ config: optimistic, status: 'ready', error: null });
        syncFolders();

        try {
          const response = await fetch(API, {
            method: 'PUT',
            headers: { accept: 'application/json', 'content-type': 'application/json' },
            body: JSON.stringify({ config: nextConfig, revision }),
          });
          const data = await response.json().catch(() => ({}));
          if (response.status === 409 && data.config) {
            set({ config: data.config, status: 'ready', error: data.error || '配置已在别处修改' });
            syncFolders();
            throw new Error(data.error || '配置已在别处修改');
          }
          if (!response.ok || !data.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
          }
          set({ config: data.config, status: 'ready', error: null });
          syncFolders();
          return data.config;
        } catch (error) {
          if (state.config === optimistic) {
            set({ config: previous, status: 'ready', error: String(error?.message ?? error) });
            syncFolders();
          }
          throw error;
        } finally {
          saving = false;
        }
      }

      function openEntry(panelId) {
        const panel = state.panels.find((item) => item.id === panelId);
        if (panel && !panel.hasMain) {
          set({ error: `入口不可用（没有主页面）：${panelId}` });
          return false;
        }
        try {
          runtimeCtx?.layout?.selectPanel?.(panelId);
          return true;
        } catch {
          set({ error: `入口不可用：${panelId}` });
          return false;
        }
      }

      function openFolder(folderId) {
        return openEntry(`${FOLDER_PREFIX}${folderId}`);
      }

      function backToManager() {
        return openEntry(MANAGER_ID);
      }

      function folderEntries(folder) {
        const byId = new Map(state.panels.map((panel) => [panel.id, panel]));
        return (folder.entries ?? []).map(
          (id) => byId.get(id) ?? { id, label: id, missing: true, hasMain: false, order: 0 },
        );
      }

      function unfiledPanels() {
        const assigned = new Set();
        for (const folder of state.config?.folders ?? []) {
          for (const id of folder.entries ?? []) assigned.add(id);
        }
        return state.panels.filter((panel) => !assigned.has(panel.id));
      }

      function folderIdFor(panelId) {
        return state.config?.folders?.find((folder) => folder.entries?.includes(panelId))?.id ?? null;
      }

      return {
        attach(ctx) {
          runtimeCtx = ctx;
        },
        start,
        stop,
        retry,
        reset,
        refresh,
        save,
        openEntry,
        openFolder,
        backToManager,
        folderEntries,
        unfiledPanels,
        folderIdFor,
        folderName,
        folderColor,
        subscribe,
        getSnapshot,
      };
    })();

    function useRuntime() {
      return useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot);
    }

    /* ------------------------------------------------------------------ */
    /* UI                                                                   */
    /* ------------------------------------------------------------------ */

    function EntryRow({ panel }) {
      const t = useT();
      const missing = Boolean(panel.missing);
      const unavailable = missing || panel.hasMain === false;
      return h(
        'button',
        {
          type: 'button',
          className: 'pem-row',
          disabled: unavailable,
          onClick: unavailable ? undefined : () => runtime.openEntry(panel.id),
        },
        h(Badge, { label: panel.label, color: unavailable ? undefined : hashColor(panel.id) }),
        h(
          'span',
          { className: 'pem-row-main' },
          h('span', { className: 'pem-row-label' }, panel.label || panel.id),
          h('span', { className: 'pem-row-id' }, panel.id),
        ),
        missing
          ? h('span', { className: 'pem-row-state' }, t('missing'))
          : panel.hasMain === false
            ? h('span', { className: 'pem-row-state' }, t('notOpenable'))
            : h(SourceTag, { panel }),
      );
    }

    function EmptyState({ title, hint, action }) {
      return h(
        'div',
        { className: 'pem-empty' },
        h('b', null, title),
        hint ? h('span', null, hint) : null,
        action ? h('div', { style: { marginTop: 12 } }, action) : null,
      );
    }

    function newFolderId() {
      return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }

    function FolderDialog({ dialog, onClose }) {
      const t = useT();
      const snap = useRuntime();
      const folder = dialog.folder ?? null;
      const isDelete = dialog.mode === 'delete';
      const [name, setName] = useState(folder?.name ?? '');
      const [color, setColor] = useState(folder?.color ?? 'blue');
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState(null);
      const inputRef = useRef(null);

      useEffect(() => {
        if (!isDelete) {
          inputRef.current?.focus();
          inputRef.current?.select();
        }
      }, [isDelete]);

      useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape' && !busy) {
            event.preventDefault();
            onClose();
          }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [busy, onClose]);

      async function commit() {
        if (!snap.config) return;
        const trimmed = name.trim();
        if (!isDelete) {
          if (!trimmed) {
            setError(t('nameRequired'));
            return;
          }
          if (trimmed.length > 40) {
            setError(t('nameTooLong'));
            return;
          }
        }

        setBusy(true);
        setError(null);
        try {
          let folders;
          if (dialog.mode === 'create') {
            folders = [
              ...snap.config.folders,
              {
                id: newFolderId(),
                name: trimmed,
                color,
                order: snap.config.folders.length,
                collapsed: false,
                entries: [],
              },
            ];
          } else if (dialog.mode === 'rename') {
            folders = snap.config.folders.map((item) =>
              item.id === folder.id ? { ...item, name: trimmed, color } : item,
            );
          } else {
            folders = snap.config.folders.filter((item) => item.id !== folder.id);
          }
          await runtime.save({ ...snap.config, folders });
          setBusy(false);
          onClose();
        } catch (saveError) {
          setBusy(false);
          setError(String(saveError?.message ?? saveError));
        }
      }

      const title =
        dialog.mode === 'create'
          ? t('createFolder')
          : dialog.mode === 'rename'
            ? t('renameFolder')
            : t('confirmDeleteTitle');

      return h(
        'div',
        {
          className: 'pem-modal-backdrop',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget && !busy) onClose();
          },
        },
        h(
          'div',
          { className: 'pem-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
          h('h2', { className: 'pem-modal-title' }, title),
          isDelete
            ? h('p', { className: 'pem-modal-desc' }, t('confirmDeleteBody').replace('{name}', folder?.name ?? ''))
            : null,
          !isDelete
            ? h(
                'div',
                { className: 'pem-field' },
                h('label', { className: 'pem-label', htmlFor: 'pem-folder-name' }, t('folderName')),
                h('input', {
                  id: 'pem-folder-name',
                  ref: inputRef,
                  className: 'pem-input',
                  value: name,
                  maxLength: 40,
                  placeholder: t('folderNamePlaceholder'),
                  onChange: (event) => setName(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter' && !busy) {
                      event.preventDefault();
                      commit();
                    }
                  },
                }),
              )
            : null,
          !isDelete
            ? h(
                'div',
                { className: 'pem-field' },
                h('div', { className: 'pem-label' }, t('color')),
                h(
                  'div',
                  { className: 'pem-colors' },
                  Object.entries(FOLDER_COLORS).map(([key, value]) =>
                    h('button', {
                      key,
                      type: 'button',
                      className: 'pem-swatch',
                      style: { background: value },
                      'aria-label': key,
                      'aria-pressed': color === key,
                      onClick: () => setColor(key),
                    }),
                  ),
                ),
              )
            : null,
          error ? h('p', { className: 'pem-modal-error' }, error) : null,
          h(
            'div',
            { className: 'pem-modal-actions' },
            h(
              'button',
              { type: 'button', className: 'pem-btn', disabled: busy, onClick: onClose },
              t('cancel'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: `pem-btn ${isDelete ? 'pem-btn-danger' : 'pem-btn-primary'}`,
                disabled: busy,
                onClick: commit,
              },
              busy ? t('saving') : isDelete ? t('delete') : dialog.mode === 'rename' ? t('save') : t('create'),
            ),
          ),
        ),
      );
    }

    function FolderCard({
      folder,
      index,
      total,
      busy,
      dragOver,
      onDragOver,
      onDragLeave,
      onDrop,
      onOpen,
      onRename,
      onDelete,
      onMove,
    }) {
      const t = useT();
      const entries = runtime.folderEntries(folder);
      return h(
        'div',
        {
          className: `pem-folder-card${dragOver ? ' pem-drop-target' : ''}`,
          onDragOver: (event) => {
            event.preventDefault();
            onDragOver?.();
          },
          onDragLeave: (event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) onDragLeave?.();
          },
          onDrop: (event) => {
            event.preventDefault();
            event.stopPropagation();
            const panelId = event.dataTransfer?.getData('text/plain');
            onDrop?.(panelId);
          },
        },
        h(
          'button',
          { type: 'button', className: 'pem-folder-main', onClick: onOpen },
          h(
            'span',
            { className: 'pem-folder-top' },
            h(FolderGlyph, {
              size: 18,
              color: FOLDER_COLORS[folder.color] ?? FOLDER_COLORS.blue,
            }),
            h('span', { className: 'pem-folder-name' }, folder.name || t('untitledFolder')),
          ),
          h('span', { className: 'pem-folder-meta' }, `${entries.length} ${t('entriesInFolder')}`),
          h(
            'span',
            { className: 'pem-folder-badges' },
            entries.slice(0, 5).map((panel) =>
              h(Badge, {
                key: panel.id,
                label: panel.label,
                color: panel.missing ? undefined : hashColor(panel.id),
              }),
            ),
          ),
        ),
        h(
          'div',
          { className: 'pem-folder-actions' },
          h(
            'button',
            {
              type: 'button',
              className: 'pem-icon-btn',
              title: t('moveUp'),
              'aria-label': t('moveUp'),
              disabled: busy || index === 0,
              onClick: () => onMove(-1),
            },
            '↑',
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'pem-icon-btn',
              title: t('moveDown'),
              'aria-label': t('moveDown'),
              disabled: busy || index === total - 1,
              onClick: () => onMove(1),
            },
            '↓',
          ),
          h(
            'button',
            { type: 'button', className: 'pem-text-btn', disabled: busy, onClick: onRename },
            t('rename'),
          ),
          h(
            'button',
            { type: 'button', className: 'pem-text-btn danger', disabled: busy, onClick: onDelete },
            t('delete'),
          ),
        ),
      );
    }

    function EntryAssignRow({ panel, folderId, folders, busy, onAssign }) {
      const t = useT();
      const openable = panel.hasMain !== false;
      return h(
        'div',
        {
          className: 'pem-row pem-assign-row',
          draggable: !busy && openable,
          onDragStart: (event) => {
            if (!openable) return;
            event.dataTransfer.setData('text/plain', panel.id);
            event.dataTransfer.effectAllowed = 'move';
          },
        },
        h(Badge, { label: panel.label, color: openable ? hashColor(panel.id) : undefined }),
        h(
          'span',
          { className: 'pem-row-main' },
          h('span', { className: 'pem-row-label' }, panel.label || panel.id),
          h('span', { className: 'pem-row-id' }, panel.id),
        ),
        h(SourceTag, { panel }),
        h(
          'select',
          {
            className: 'pem-select',
            value: folderId ?? '',
            disabled: busy || !openable,
            'aria-label': t('currentFolder'),
            onChange: (event) => onAssign(panel.id, event.target.value || null),
          },
          h('option', { value: '' }, t('unfiled')),
          folders.map((folder) => h('option', { key: folder.id, value: folder.id }, folder.name)),
        ),
      );
    }

    function EntriesPanel({ panels, folders, query, onQueryChange, busyEntry, onAssign }) {
      const t = useT();
      const [dropChip, setDropChip] = useState(null);
      const needle = query.trim().toLowerCase();
      const filtered = needle
        ? panels.filter(
            (panel) =>
              panel.label.toLowerCase().includes(needle) || panel.id.toLowerCase().includes(needle),
          )
        : panels;

      function chipProps(folderId) {
        const key = folderId ?? '__unfiled__';
        return {
          onDragOver: (event) => {
            event.preventDefault();
            setDropChip(key);
          },
          onDragLeave: () => setDropChip(null),
          onDrop: (event) => {
            event.preventDefault();
            setDropChip(null);
            const panelId = event.dataTransfer?.getData('text/plain');
            if (panelId) onAssign(panelId, folderId);
          },
        };
      }

      return h(
        'section',
        { className: 'pem-section' },
        h(
          'div',
          { className: 'pem-section-head' },
          h('h2', { className: 'pem-section-title' }, t('allEntriesTitle')),
          h('span', { className: 'pem-section-hint' }, t('allEntriesHint')),
        ),
        h(
          'div',
          { className: 'pem-toolbar' },
          h('input', {
            className: 'pem-search',
            value: query,
            placeholder: t('searchEntries'),
            'aria-label': t('searchEntries'),
            onChange: (event) => onQueryChange(event.target.value),
          }),
        ),
        h(
          'div',
          { className: 'pem-folder-rail', 'aria-label': t('currentFolder') },
          h(
            'span',
            {
              className: `pem-folder-chip${dropChip === '__unfiled__' ? ' pem-drop-target' : ''}`,
              ...chipProps(null),
            },
            t('unfiled'),
          ),
          folders.map((folder) =>
            h(
              'span',
              {
                key: folder.id,
                className: `pem-folder-chip${dropChip === folder.id ? ' pem-drop-target' : ''}`,
                ...chipProps(folder.id),
              },
              h(FolderGlyph, {
                size: 13,
                color: FOLDER_COLORS[folder.color] ?? FOLDER_COLORS.blue,
              }),
              folder.name,
            ),
          ),
        ),
        filtered.length === 0
          ? h(EmptyState, { title: t('noResults') })
          : h(
              'div',
              { className: 'pem-list' },
              filtered.map((panel) =>
                h(EntryAssignRow, {
                  key: panel.id,
                  panel,
                  folderId: runtime.folderIdFor(panel.id),
                  folders,
                  busy: busyEntry !== null,
                  onAssign,
                }),
              ),
            ),
      );
    }

    function SettingsPanel({ snap, folders, busyEntry, onAssign }) {
      const t = useT();
      const [selected, setSelected] = useState(() => new Set());
      const [targetFolder, setTargetFolder] = useState('');
      const [query, setQuery] = useState('');
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState(null);
      const [notice, setNotice] = useState(null);

      const mainRegistered = new Set(
        snap.panels.filter((panel) => panel.hasMain).map((panel) => panel.id),
      );
      const rows = [];
      const seenRows = new Set();
      for (const panel of snap.panels) {
        if (seenRows.has(panel.id)) continue;
        seenRows.add(panel.id);
        rows.push({ ...panel, missing: false, folderId: runtime.folderIdFor(panel.id) });
      }
      for (const folder of folders) {
        for (const id of folder.entries ?? []) {
          if (seenRows.has(id)) continue;
          seenRows.add(id);
          rows.push({
            id,
            label: id,
            missing: true,
            hasMain: false,
            hasSidebar: false,
            folderId: folder.id,
          });
        }
      }

      const invalidCount = rows.filter((row) => !row.hasMain).length;
      const needle = query.trim().toLowerCase();
      const filtered = needle
        ? rows.filter(
            (row) =>
              row.label.toLowerCase().includes(needle) || row.id.toLowerCase().includes(needle),
          )
        : rows;
      const allVisibleSelected =
        filtered.length > 0 && filtered.every((row) => selected.has(row.id));
      const locked = busy || busyEntry !== null;
      const assignableSelected = new Set(
        [...selected].filter((id) => rows.find((row) => row.id === id)?.hasMain),
      );

      function toggle(id) {
        setSelected((previous) => {
          const next = new Set(previous);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      }

      function toggleAllVisible() {
        setSelected((previous) => {
          const next = new Set(previous);
          if (allVisibleSelected) {
            for (const row of filtered) next.delete(row.id);
          } else {
            for (const row of filtered) next.add(row.id);
          }
          return next;
        });
      }

      async function persist(nextFolders, message) {
        setBusy(true);
        setError(null);
        setNotice(null);
        try {
          await runtime.save({ ...snap.config, folders: nextFolders });
          setSelected(new Set());
          if (message) setNotice(message);
        } catch (saveError) {
          setError(String(saveError?.message ?? saveError));
        } finally {
          setBusy(false);
        }
      }

      async function bulkMove() {
        if (!assignableSelected.size || !targetFolder) return;
        const next = folders.map((folder) => ({
          ...folder,
          entries: [...(folder.entries ?? [])].filter((id) => !assignableSelected.has(id)),
        }));
        const target = next.find((folder) => folder.id === targetFolder);
        if (target) {
          for (const id of assignableSelected) target.entries.push(id);
        }
        await persist(next);
      }

      async function bulkRemove() {
        if (!selected.size) return;
        const next = folders.map((folder) => ({
          ...folder,
          entries: [...(folder.entries ?? [])].filter((id) => !selected.has(id)),
        }));
        await persist(next);
      }

      async function cleanupStale() {
        if (invalidCount === 0) {
          setNotice(t('noStale'));
          return;
        }
        const next = folders.map((folder) => ({
          ...folder,
          entries: [...(folder.entries ?? [])].filter((id) => mainRegistered.has(id)),
        }));
        await persist(next, t('cleanupDone').replace('{n}', String(invalidCount)));
      }

      return h(
        'section',
        { className: 'pem-section' },
        h(
          'div',
          { className: 'pem-section-head' },
          h('h2', { className: 'pem-section-title' }, t('settingsTitle')),
          h('span', { className: 'pem-section-hint' }, t('settingsHint')),
        ),
        h(
          'div',
          { className: 'pem-toolbar' },
          h('input', {
            className: 'pem-search',
            value: query,
            placeholder: t('searchEntries'),
            'aria-label': t('searchEntries'),
            onChange: (event) => setQuery(event.target.value),
          }),
        ),
        h(
          'div',
          { className: 'pem-bulkbar' },
          h('span', { className: 'pem-section-hint' }, t('bulkSelected').replace('{n}', String(selected.size))),
          h('span', { className: 'pem-section-hint' }, t('bulkMoveTo')),
          h(
            'select',
            {
              className: 'pem-select',
              value: targetFolder,
              'aria-label': t('bulkMoveTo'),
              disabled: locked || folders.length === 0,
              onChange: (event) => setTargetFolder(event.target.value),
            },
            h('option', { value: '' }, t('moveTargetPlaceholder')),
            folders.map((folder) => h('option', { key: folder.id, value: folder.id }, folder.name)),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'pem-btn pem-btn-primary',
              disabled: locked || assignableSelected.size === 0 || !targetFolder || folders.length === 0,
              onClick: bulkMove,
            },
            t('bulkMove'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'pem-btn',
              disabled: locked || selected.size === 0,
              onClick: bulkRemove,
            },
            t('bulkRemove'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'pem-btn',
              disabled: locked || invalidCount === 0,
              onClick: cleanupStale,
            },
            `${t('cleanupStale')}${invalidCount > 0 ? ` (${invalidCount})` : ''}`,
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'pem-btn',
              disabled: locked || selected.size === 0,
              onClick: () => setSelected(new Set()),
            },
            t('clearSelection'),
          ),
        ),
        error ? h('div', { className: 'pem-error', style: { marginBottom: 10 } }, error) : null,
        notice ? h('div', { className: 'pem-drop-hint' }, notice) : null,
        filtered.length === 0
          ? h(EmptyState, { title: t('settingsEmpty') })
          : h(
              'div',
              { className: 'pem-table' },
              h(
                'div',
                { className: 'pem-table-head' },
                h('input', {
                  type: 'checkbox',
                  checked: allVisibleSelected,
                  'aria-label': t('selectAllVisible'),
                  onChange: toggleAllVisible,
                }),
                h('span', null, t('entryColumn')),
                h('span', null, t('folderColumn')),
                h('span', null, t('statusColumn')),
              ),
              filtered.map((row) =>
                h(
                  'div',
                  {
                    key: row.id,
                    className: `pem-table-row${row.hasMain ? '' : ' missing'}`,
                  },
                  h('input', {
                    type: 'checkbox',
                    checked: selected.has(row.id),
                    'aria-label': row.label,
                    disabled: locked,
                    onChange: () => toggle(row.id),
                  }),
                  h(
                    'div',
                    { className: 'pem-table-entry' },
                    h(Badge, {
                      label: row.label,
                      color: row.missing ? undefined : hashColor(row.id),
                    }),
                    h(
                      'span',
                      { className: 'pem-row-main' },
                      h('span', { className: 'pem-row-label' }, row.label || row.id),
                      h('span', { className: 'pem-row-id' }, row.id),
                    ),
                    h(SourceTag, { panel: row }),
                  ),
                  !row.hasMain
                    ? h(
                        'span',
                        { className: 'pem-status' },
                        row.missing ? t('missing') : t('notOpenable'),
                      )
                    : h(
                        'select',
                        {
                          className: 'pem-select',
                          value: row.folderId ?? '',
                          disabled: locked,
                          'aria-label': t('currentFolder'),
                          onChange: (event) => onAssign(row.id, event.target.value || null),
                        },
                        h('option', { value: '' }, t('unfiled')),
                        folders.map((folder) =>
                          h('option', { key: folder.id, value: folder.id }, folder.name),
                        ),
                      ),
                  h(
                    'span',
                    { className: `pem-status${row.hasMain ? '' : ' missing'}` },
                    row.missing
                      ? t('statusMissing')
                      : row.hasMain
                        ? t('statusOk')
                        : t('notOpenable'),
                  ),
                ),
              ),
            ),
      );
    }

    function ManagerPage() {
      const t = useT();
      const snap = useRuntime();
      const [dialog, setDialog] = useState(null);
      const [busyId, setBusyId] = useState(null);
      const [busyEntry, setBusyEntry] = useState(null);
      const [dragOver, setDragOver] = useState(null);
      const [tab, setTab] = useState('folders');
      const [query, setQuery] = useState('');
      const [resetArmed, setResetArmed] = useState(false);
      useEffect(() => {
        runtime.refresh();
      }, []);

      if (snap.status === 'loading' || snap.status === 'idle') {
        return h(
          'div',
          { className: 'pem-page' },
          h(
            'div',
            { className: 'pem-wrap' },
            h('div', { className: 'pem-kicker' }, t('kicker')),
            h('h1', { className: 'pem-title' }, t('title')),
            h('div', { className: 'pem-loading' }, h('span', { className: 'pem-spinner' }), t('loading')),
          ),
        );
      }

      if (snap.status === 'error') {
        return h(
          'div',
          { className: 'pem-page' },
          h(
            'div',
            { className: 'pem-wrap' },
            h('div', { className: 'pem-kicker' }, t('kicker')),
            h('h1', { className: 'pem-title' }, t('title')),
            h(
              'div',
              { className: 'pem-error' },
              h('div', { style: { fontWeight: 600, marginBottom: 6 } }, t('errorTitle')),
              h('div', null, snap.error),
            ),
            h(
              'div',
              { style: { marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', { type: 'button', className: 'pem-btn', onClick: () => runtime.retry() }, t('retry')),
              h(
                'button',
                {
                  type: 'button',
                  className: 'pem-btn',
                  onClick: async () => {
                    if (!resetArmed) {
                      setResetArmed(true);
                      return;
                    }
                    try {
                      await runtime.reset();
                      setResetArmed(false);
                    } catch {
                      /* 错误已写入状态 */
                    }
                  },
                },
                resetArmed ? t('resetConfirm') : t('resetConfig'),
              ),
            ),
            h('div', { className: 'pem-drop-hint' }, t('resetHint')),
          ),
        );
      }

      const folders = snap.config?.folders ?? [];
      const unfiled = runtime.unfiledPanels();

      async function moveFolder(folder, delta) {
        if (busyId) return;
        const index = folders.findIndex((item) => item.id === folder.id);
        const target = index + delta;
        if (index < 0 || target < 0 || target >= folders.length) return;
        const next = folders.map((item) => ({ ...item }));
        [next[index], next[target]] = [next[target], next[index]];
        next.forEach((item, order) => {
          item.order = order;
        });
        setBusyId(folder.id);
        try {
          await runtime.save({ ...snap.config, folders: next });
        } catch {
          /* 错误已由 runtime 写入 error 横幅 */
        } finally {
          setBusyId(null);
        }
      }

      async function assignEntry(panelId, folderId) {
        if (!snap.config || busyEntry) return;
        if (!snap.panels.find((panel) => panel.id === panelId)?.hasMain) return;
        if (runtime.folderIdFor(panelId) === (folderId ?? null)) return;
        const next = snap.config.folders.map((folder) => ({
          ...folder,
          entries: [...(folder.entries ?? [])].filter((id) => id !== panelId),
        }));
        if (folderId) {
          const target = next.find((folder) => folder.id === folderId);
          if (target) target.entries.push(panelId);
        }
        setBusyEntry(panelId);
        try {
          await runtime.save({ ...snap.config, folders: next });
        } catch {
          /* 错误已由 runtime 写入 error 横幅 */
        } finally {
          setBusyEntry(null);
        }
      }

      return h(
        'div',
        { className: 'pem-page' },
        h(
          'div',
          { className: 'pem-wrap' },
          h(
            'div',
            { className: 'pem-head' },
            h(
              'div',
              null,
              h('div', { className: 'pem-kicker' }, t('kicker')),
              h('h1', { className: 'pem-title' }, t('title')),
              h('p', { className: 'pem-subtitle' }, t('subtitle')),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'pem-btn pem-btn-primary',
                onClick: () => setDialog({ mode: 'create' }),
              },
              `+ ${t('newFolder')}`,
            ),
          ),
          h(
            'div',
            { className: 'pem-meta' },
            h('span', { className: 'pem-pill' }, h('span', { className: 'pem-dot' }), t('ready')),
            h('span', { className: 'pem-pill' }, t('folderCount'), ' ', h('b', null, folders.length)),
            h('span', { className: 'pem-pill' }, t('entryCount'), ' ', h('b', null, snap.panels.length)),
            h('span', { className: 'pem-pill' }, t('unfiledCount'), ' ', h('b', null, unfiled.length)),
            h(
              'button',
              {
                type: 'button',
                className: 'pem-btn',
                style: { marginLeft: 'auto' },
                onClick: () => runtime.refresh(),
              },
              t('refresh'),
            ),
          ),
          snap.error
            ? h('div', { className: 'pem-error', style: { marginTop: 14 } }, snap.error)
            : null,
          h(
            'div',
            { className: 'pem-tabbar', role: 'tablist', 'aria-label': t('title') },
            [
              ['folders', t('tabFolders')],
              ['entries', t('tabEntries')],
              ['settings', t('tabSettings')],
            ].map(([id, label]) =>
              h(
                'button',
                {
                  key: id,
                  type: 'button',
                  role: 'tab',
                  'aria-selected': tab === id,
                  className: 'pem-tab',
                  onClick: () => setTab(id),
                },
                label,
              ),
            ),
          ),
          tab === 'folders'
            ? h(
                React.Fragment,
                null,
                h(
                  'section',
                  { className: 'pem-section' },
                  h(
                    'div',
                    { className: 'pem-section-head' },
                    h('h2', { className: 'pem-section-title' }, t('foldersTitle')),
                    h('span', { className: 'pem-section-hint' }, t('readyHint')),
                  ),
                  folders.length === 0
                    ? h(EmptyState, {
                        title: t('noFolders'),
                        hint: t('noFoldersHint'),
                        action: h(
                          'button',
                          {
                            type: 'button',
                            className: 'pem-btn pem-btn-primary',
                            onClick: () => setDialog({ mode: 'create' }),
                          },
                          `+ ${t('newFolder')}`,
                        ),
                      })
                    : h(
                        'div',
                        { className: 'pem-grid' },
                        folders.map((folder, index) =>
                          h(FolderCard, {
                            key: folder.id,
                            folder,
                            index,
                            total: folders.length,
                            busy: busyId !== null,
                            dragOver: dragOver === folder.id,
                            onDragOver: () => setDragOver(folder.id),
                            onDragLeave: () => setDragOver(null),
                            onDrop: (panelId) => {
                              setDragOver(null);
                              if (panelId) assignEntry(panelId, folder.id);
                            },
                            onOpen: () => runtime.openFolder(folder.id),
                            onRename: () => setDialog({ mode: 'rename', folder }),
                            onDelete: () => setDialog({ mode: 'delete', folder }),
                            onMove: (delta) => moveFolder(folder, delta),
                          }),
                        ),
                      ),
                ),
                h(
                  'section',
                  {
                    className: 'pem-section',
                    onDragOver: (event) => {
                      event.preventDefault();
                      setDragOver('__unfiled__');
                    },
                    onDragLeave: () => setDragOver(null),
                    onDrop: (event) => {
                      event.preventDefault();
                      setDragOver(null);
                      const panelId = event.dataTransfer?.getData('text/plain');
                      if (panelId) assignEntry(panelId, null);
                    },
                  },
                  h(
                    'div',
                    { className: 'pem-section-head' },
                    h('h2', { className: 'pem-section-title' }, t('unfiledTitle')),
                    h('span', { className: 'pem-section-hint' }, `${unfiled.length}`),
                  ),
                  unfiled.length === 0
                    ? h(EmptyState, { title: t('noUnfiled') })
                    : h(
                        'div',
                        { className: 'pem-list' },
                        unfiled.map((panel) =>
                          h(EntryAssignRow, {
                            key: panel.id,
                            panel,
                            folderId: null,
                            folders,
                            busy: busyEntry !== null,
                            onAssign: assignEntry,
                          }),
                        ),
                      ),
                  h('div', { className: 'pem-drop-hint' }, t('dragHint')),
                ),
              )
            : tab === 'entries'
              ? h(EntriesPanel, {
                  panels: snap.panels,
                  folders,
                  query,
                  onQueryChange: setQuery,
                  busyEntry,
                  onAssign: assignEntry,
                })
              : h(SettingsPanel, {
                  snap,
                  folders,
                  busyEntry,
                  onAssign: assignEntry,
                }),
          h('div', { className: 'pem-foot' }, t('managerNote')),
          dialog ? h(FolderDialog, { dialog, onClose: () => setDialog(null) }) : null,
        ),
      );
    }

    function FolderEntryRow({ panel, onOpen, onRemove, busy }) {
      const t = useT();
      const unavailable = Boolean(panel.missing) || panel.hasMain === false;
      return h(
        'div',
        { className: 'pem-folder-entry' },
        h(
          'button',
          {
            type: 'button',
            className: 'pem-entry-open',
            disabled: unavailable,
            onClick: unavailable ? undefined : onOpen,
          },
          h(Badge, { label: panel.label, color: unavailable ? undefined : hashColor(panel.id) }),
          h(
            'span',
            { className: 'pem-row-main' },
            h('span', { className: 'pem-row-label' }, panel.label || panel.id),
            h('span', { className: 'pem-row-id' }, panel.id),
          ),
          panel.missing
            ? h('span', { className: 'pem-row-state' }, t('missing'))
            : panel.hasMain === false
              ? h('span', { className: 'pem-row-state' }, t('notOpenable'))
              : h(SourceTag, { panel }),
        ),
        h(
          'button',
          { type: 'button', className: 'pem-text-btn danger', disabled: busy, onClick: onRemove },
          t('remove'),
        ),
      );
    }

    function MemberDrawer({ folder, onClose }) {
      const t = useT();
      const snap = useRuntime();
      const [selected, setSelected] = useState(() => new Set(folder.entries ?? []));
      const [query, setQuery] = useState('');
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState(null);

      const mainPanels = snap.panels.filter((panel) => panel.hasMain);
      const registered = new Set(mainPanels.map((panel) => panel.id));
      const staleIds = (folder.entries ?? []).filter((id) => !registered.has(id));
      const needle = query.trim().toLowerCase();
      const filtered = needle
        ? mainPanels.filter(
            (panel) =>
              panel.label.toLowerCase().includes(needle) || panel.id.toLowerCase().includes(needle),
          )
        : mainPanels;
      const filteredStale = needle ? staleIds.filter((id) => id.toLowerCase().includes(needle)) : staleIds;

      useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape' && !busy) {
            event.preventDefault();
            onClose();
          }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [busy, onClose]);

      function toggle(id) {
        setSelected((previous) => {
          const next = new Set(previous);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      }

      function selectAll() {
        setSelected((previous) => {
          const next = new Set(previous);
          for (const panel of filtered) next.add(panel.id);
          return next;
        });
      }

      function clearAll() {
        setSelected((previous) => {
          const next = new Set(previous);
          for (const panel of filtered) next.delete(panel.id);
          return next;
        });
      }

      async function save() {
        setBusy(true);
        setError(null);
        try {
          const ordered = [];
          for (const id of folder.entries ?? []) {
            if (selected.has(id)) ordered.push(id);
          }
          for (const panel of mainPanels) {
            if (selected.has(panel.id) && !ordered.includes(panel.id)) ordered.push(panel.id);
          }
          const folders = snap.config.folders.map((item) =>
            item.id === folder.id ? { ...item, entries: ordered } : item,
          );
          await runtime.save({ ...snap.config, folders });
          setBusy(false);
          onClose();
        } catch (saveError) {
          setBusy(false);
          setError(String(saveError?.message ?? saveError));
        }
      }

      return h(
        'div',
        {
          className: 'pem-drawer-backdrop',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget && !busy) onClose();
          },
        },
        h(
          'div',
          {
            className: 'pem-drawer',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': t('membersTitle').replace('{name}', folder.name),
          },
          h(
            'div',
            { className: 'pem-drawer-head' },
            h(
              'div',
              null,
              h('h2', { className: 'pem-drawer-title' }, t('membersTitle').replace('{name}', folder.name)),
              h('p', { className: 'pem-subtitle' }, t('membersHint')),
              h(
                'div',
                { className: 'pem-meta', style: { marginTop: 8 } },
                h('span', { className: 'pem-pill' }, t('selectedCount').replace('{n}', String(selected.size))),
              ),
            ),
            h(
              'button',
              { type: 'button', className: 'pem-btn', disabled: busy, onClick: onClose },
              t('close'),
            ),
          ),
          h(
            'div',
            { className: 'pem-drawer-body' },
            h(
              'div',
              { className: 'pem-drawer-toolbar' },
              h('input', {
                className: 'pem-search',
                value: query,
                placeholder: t('searchEntries'),
                'aria-label': t('searchEntries'),
                onChange: (event) => setQuery(event.target.value),
              }),
              h('button', { type: 'button', className: 'pem-btn', onClick: selectAll }, t('selectAll')),
              h('button', { type: 'button', className: 'pem-btn', onClick: clearAll }, t('clearAll')),
            ),
            filtered.length === 0
              ? h(EmptyState, { title: t('noMembers') })
              : filtered.map((panel) =>
                  h(
                    'label',
                    { key: panel.id, className: 'pem-check-row' },
                    h('input', {
                      type: 'checkbox',
                      checked: selected.has(panel.id),
                      onChange: () => toggle(panel.id),
                    }),
                    h(Badge, { label: panel.label, color: hashColor(panel.id) }),
                    h(
                      'span',
                      { className: 'pem-row-main' },
                      h('span', { className: 'pem-row-label' }, panel.label || panel.id),
                      h('span', { className: 'pem-row-id' }, panel.id),
                    ),
                  ),
                ),
            filteredStale.length > 0
              ? h(
                  'div',
                  null,
                  h('div', { className: 'pem-drawer-section' }, t('missingEntries')),
                  filteredStale.map((id) =>
                    h(
                      'label',
                      { key: id, className: 'pem-check-row' },
                      h('input', {
                        type: 'checkbox',
                        checked: selected.has(id),
                        onChange: () => toggle(id),
                      }),
                      h(Badge, { label: id }),
                      h(
                        'span',
                        { className: 'pem-row-main' },
                        h('span', { className: 'pem-row-label' }, id),
                        h('span', { className: 'pem-row-id' }, t('missing')),
                      ),
                    ),
                  ),
                )
              : null,
          ),
          error ? h('p', { className: 'pem-modal-error' }, error) : null,
          h(
            'div',
            { className: 'pem-drawer-foot' },
            h(
              'button',
              { type: 'button', className: 'pem-btn', disabled: busy, onClick: onClose },
              t('cancel'),
            ),
            h(
              'button',
              { type: 'button', className: 'pem-btn pem-btn-primary', disabled: busy, onClick: save },
              busy ? t('saving') : t('saveMembers'),
            ),
          ),
        ),
      );
    }

    function FolderPage({ folderId }) {
      const t = useT();
      const snap = useRuntime();
      const folder = snap.config?.folders?.find((item) => item.id === folderId);
      const [drawerOpen, setDrawerOpen] = useState(false);
      const [busy, setBusy] = useState(false);

      if (!folder) {
        return h(
          'div',
          { className: 'pem-page' },
          h(
            'div',
            { className: 'pem-wrap' },
            h(
              'button',
              { type: 'button', className: 'pem-back', onClick: () => runtime.backToManager() },
              '← ',
              t('back'),
            ),
            h('h1', { className: 'pem-title' }, t('folderMissing')),
            h('p', { className: 'pem-subtitle' }, t('folderMissingHint')),
            h(
              'div',
              { style: { marginTop: 16 } },
              h('button', { type: 'button', className: 'pem-btn', onClick: () => runtime.backToManager() }, t('openManager')),
            ),
          ),
        );
      }

      const entries = runtime.folderEntries(folder);

      async function removeMember(panelId) {
        if (!snap.config || busy) return;
        const folders = snap.config.folders.map((item) =>
          item.id === folder.id
            ? { ...item, entries: (item.entries ?? []).filter((id) => id !== panelId) }
            : item,
        );
        setBusy(true);
        try {
          await runtime.save({ ...snap.config, folders });
        } catch {
          /* 错误由 runtime 写入 error 横幅 */
        } finally {
          setBusy(false);
        }
      }

      return h(
        'div',
        { className: 'pem-page' },
        h(
          'div',
          { className: 'pem-wrap' },
          h(
            'button',
            { type: 'button', className: 'pem-back', onClick: () => runtime.backToManager() },
            '← ',
            t('back'),
          ),
          snap.error ? h('div', { className: 'pem-error', style: { marginBottom: 14 } }, snap.error) : null,
          h(
            'div',
            { className: 'pem-head' },
            h(
              'div',
              null,
              h('div', { className: 'pem-kicker' }, t('kicker')),
              h(
                'h1',
                { className: 'pem-title', style: { display: 'flex', alignItems: 'center', gap: 10 } },
                h(FolderGlyph, { size: 24, color: runtime.folderColor(folder.id) }),
                folder.name || t('untitledFolder'),
              ),
              h('p', { className: 'pem-subtitle' }, `${entries.length} ${t('entriesInFolder')}`),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'pem-btn pem-btn-primary',
                onClick: () => setDrawerOpen(true),
              },
              t('editMembers'),
            ),
          ),
          h(
            'section',
            { className: 'pem-section' },
            entries.length === 0
              ? h(EmptyState, { title: t('noEntries') })
              : h(
                  'div',
                  { className: 'pem-list' },
                  entries.map((panel) =>
                    h(FolderEntryRow, {
                      key: panel.id,
                      panel,
                      busy,
                      onOpen: () => runtime.openEntry(panel.id),
                      onRemove: () => removeMember(panel.id),
                    }),
                  ),
                ),
          ),
          drawerOpen ? h(MemberDrawer, { folder, onClose: () => setDrawerOpen(false) }) : null,
        ),
      );
    }

    return {
      inject: ['slots', 'layout', 'locale'],
      __test: { getPanels: () => runtime.getSnapshot().panels },
      apply(ctx) {
        const locale = ctx.locale;
        localeRef = locale;
        ensureStyles();

        const disposers = Object.entries(DICTIONARIES).map(([tag, dictionary]) =>
          locale.register(NS, tag, dictionary),
        );
        const t = locale.bind(NS);

        runtime.attach(ctx);

        const disposeEntry = ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            { name: 'sidebar.panellist', id: MANAGER_ID, order: MANAGER_ORDER, label: () => t('navLabel') },
            FolderGlyph,
          ),
        );

        const disposePage = ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: MANAGER_ID }, ManagerPage),
        );

        runtime.start();

        return () => {
          runtime.stop();
          disposePage();
          disposeEntry();
          disposers.forEach((dispose) => dispose());
          localeRef = null;
        };
      },
    };
  },
});
