const root = document.getElementById('app');
const state = {
  user: null, users: [], documents: [], active: null,
  timer: null, toastTimer: null, dirty: false, saving: false, saveError: false, savePromise: null,
  sidebarCollapsed: false, mobileSidebarOpen: false, accessTimer: null, selectionRange: null,
  pendingMarks: null, pendingMarksRange: null,
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin', ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

const initials = user => user.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
const roleLabel = role => role === 'editor' ? 'Can edit' : role === 'viewer' ? 'Can view' : 'Owner';
function escapeText(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function showToast(message, error = false) {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = `toast${error ? ' error' : ''}`;
  toast.textContent = message;
  toast.role = 'status';
  document.body.append(toast);
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.remove(), 3800);
}
function setSaveStatus(text, mode = '') {
  const node = document.querySelector('.save-state');
  if (!node) return;
  node.textContent = text;
  node.className = `save-state ${mode}`;
}
async function refreshDocuments(keepActive = true) {
  const data = await api('/api/documents');
  state.documents = data.documents;
  if (keepActive && state.active) {
    const found = state.documents.find(doc => doc.id === state.active.id);
    state.active = found ? { ...state.active, ...found } : null;
  }
}

function renderLogin() {
  root.innerHTML = `<div class="login-shell"><section class="login-art"><div class="brand"><span class="brand-mark">a.</span> ajaia docs</div><div class="art-copy"><div class="eyebrow">A quieter place to write</div><h1>Make room<br>for good ideas.</h1><p>A thoughtful workspace for the notes, plans, and documents worth sharing.</p></div><div class="orbit" aria-hidden="true"></div></section><section class="login-card"><div class="eyebrow">Demo workspace</div><h2>Welcome back</h2><p>Choose a demo account to open your workspace. No password is needed for this assessment demo.</p><div class="user-choice">${state.users.map(user => `<button class="account-option" data-email="${escapeText(user.email)}"><span class="avatar">${initials(user)}</span><span class="account-text"><strong>${escapeText(user.name)}</strong><small>${escapeText(user.email)}</small></span><span class="arrow">→</span></button>`).join('')}</div><p class="fine-print">Demo sign-in only. This is not production authentication.</p></section></div>`;
  root.querySelectorAll('[data-email]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const data = await api('/api/login', { method: 'POST', body: JSON.stringify({ email: button.dataset.email }) });
      state.user = data.user;
      await refreshDocuments(false);
      state.active = null;
      renderWorkspace();
    } catch (error) {
      showToast(error.message, true);
      button.disabled = false;
    }
  }));
}

function docRows(docs, shared) {
  if (!docs.length) return '<div class="empty-list">Nothing here yet</div>';
  return docs.map(doc => {
    const detail = shared ? `Shared by ${doc.owner?.name || 'Unknown owner'} · ${roleLabel(doc.access)}` : '';
    return `<button class="doc-item ${state.active?.id === doc.id ? 'active' : ''}" data-id="${escapeText(doc.id)}"><span class="doc-icon" aria-hidden="true">▤</span><span class="doc-item-copy"><strong>${escapeText(doc.title)}</strong>${shared ? `<small>${escapeText(detail)}</small>` : ''}</span></button>`;
  }).join('');
}

function isMobile() { return window.matchMedia('(max-width: 760px)').matches; }
function sidebarIsOpen() { return isMobile() ? state.mobileSidebarOpen : !state.sidebarCollapsed; }
function syncSidebar() {
  const workspace = document.querySelector('.workspace');
  const sidebar = document.querySelector('#sidebar');
  const toggle = document.querySelector('#sidebar-toggle');
  const close = document.querySelector('#close-sidebar');
  if (!workspace || !sidebar || !toggle || !close) return;
  workspace.classList.toggle('sidebar-collapsed', !isMobile() && state.sidebarCollapsed);
  sidebar.classList.toggle('open', isMobile() && state.mobileSidebarOpen);
  toggle.setAttribute('aria-expanded', String(sidebarIsOpen()));
  close.setAttribute('aria-expanded', String(sidebarIsOpen()));
  toggle.setAttribute('aria-label', sidebarIsOpen() ? 'Sidebar open' : 'Open sidebar');
}
function openSidebar() {
  if (isMobile()) state.mobileSidebarOpen = true;
  else state.sidebarCollapsed = false;
  syncSidebar();
  document.querySelector('#close-sidebar')?.focus();
}
function closeSidebar() {
  if (isMobile()) state.mobileSidebarOpen = false;
  else state.sidebarCollapsed = true;
  syncSidebar();
  document.querySelector('#sidebar-toggle')?.focus();
}
async function closeDocumentToList() {
  const activeId = state.active?.id;
  if (!activeId) { closeSidebar(); return; }
  try {
    if (!await flushPendingSave()) return;
    if (state.active?.id !== activeId) return;
    state.active = null; state.dirty = false;
    clearTimeout(state.timer); state.timer = null;
    renderWorkspace();
  } catch (error) { showToast(error.message, true); }
}

function renderWorkspace() {
  if (!state.user) return renderLogin();
  const own = state.documents.filter(doc => doc.access === 'owner');
  const shared = state.documents.filter(doc => doc.access !== 'owner');
  const sidebarClass = `sidebar${state.mobileSidebarOpen ? ' open' : ''}`;
  const activeMeta = state.active && state.active.access !== 'owner'
    ? `<small class="document-meta">Shared by ${escapeText(state.active.owner?.name || 'Unknown owner')} · ${roleLabel(state.active.access)}</small>`
    : '';
  const topTitle = state.active
    ? `<div class="title-wrap"><div class="title-line"><input class="doc-title" id="doc-title" aria-label="Document title" maxlength="120" value="${escapeText(state.active.title)}"><span class="save-state saved">Saved</span></div>${activeMeta}</div>`
    : `<div class="title-wrap"><strong class="user-mobile">${escapeText(state.user.name)}’s workspace</strong></div>`;
  const deleteButton = state.active?.access === 'owner' ? '<button class="delete-btn" id="delete-document">Delete document</button>' : '';
  root.innerHTML = `<div class="workspace${state.sidebarCollapsed ? ' sidebar-collapsed' : ''}">
    <aside class="sidebar" id="sidebar" aria-label="Document navigation">
      <div class="side-top"><div class="brand"><span class="brand-mark">a.</span> ajaia docs</div><button class="icon-btn" id="close-sidebar" aria-label="${state.active ? 'Close document and return to documents' : 'Close sidebar'}" title="${state.active ? 'Back to documents' : 'Close sidebar'}" aria-controls="sidebar" aria-expanded="true">×</button></div>
      <button class="new-btn" id="new-doc"><span aria-hidden="true">＋</span> New document</button>
      <div class="nav-label">My documents</div><div class="doc-list">${docRows(own, false)}</div>
      <div class="nav-label" style="margin-top:24px">Shared with me</div><div class="doc-list">${docRows(shared, true)}</div>
      <div class="sidebar-spacer"></div><div class="side-bottom"><div class="user-switch"><span class="avatar">${initials(state.user)}</span><span class="user-meta"><strong>${escapeText(state.user.name)}</strong><small>${escapeText(state.user.email)}</small></span></div></div>
    </aside>
    <section class="main"><header class="topbar">
      <button class="icon-btn mobile-menu" id="sidebar-toggle" aria-label="Sidebar open" aria-controls="sidebar" aria-expanded="true" title="Open sidebar">☰</button>
      ${topTitle}
      <div class="top-actions">
        <div class="account-menu-wrap"><button class="account-toggle" id="account-toggle" aria-haspopup="true" aria-expanded="false" aria-controls="account-menu" title="Switch demo account"><span class="avatar">${initials(state.user)}</span><span class="account-label">${escapeText(state.user.name)}</span><span aria-hidden="true">⌄</span></button><div class="account-menu" id="account-menu" role="menu" hidden>${state.users.map(user => `<button class="account-choice" role="menuitem" data-account-email="${escapeText(user.email)}" ${user.id === state.user.id ? 'aria-current="true"' : ''}><span class="avatar">${initials(user)}</span><span><strong>${escapeText(user.name)}</strong><small>${escapeText(user.email)}</small></span>${user.id === state.user.id ? '<span class="current-check" aria-label="Current account">✓</span>' : ''}</button>`).join('')}</div></div>
        ${state.active ? `${deleteButton}<button class="share-btn" id="share" ${state.active.canShare ? '' : 'disabled'}>Share</button>` : '<button class="primary-btn" id="new-doc-top">＋ New</button>'}
        <button class="logout-top-btn" id="logout-btn">Log out</button>
      </div>
    </header>${state.active ? editorMarkup() : emptyMarkup()}</section>
  </div>`;
  syncSidebar();
  root.querySelectorAll('[data-id]').forEach(button => button.addEventListener('click', () => openDocument(button.dataset.id)));
  root.querySelector('#new-doc')?.addEventListener('click', createDocument);
  root.querySelector('#new-doc-top')?.addEventListener('click', createDocument);
  root.querySelector('#empty-new')?.addEventListener('click', createDocument);
  root.querySelector('#empty-import-file')?.addEventListener('change', importFile);
  root.querySelector('#sidebar-toggle')?.addEventListener('click', () => sidebarIsOpen() ? closeSidebar() : openSidebar());
  root.querySelector('#close-sidebar')?.addEventListener('click', closeDocumentToList);
  root.querySelector('#logout-btn')?.addEventListener('click', logout);
  root.querySelector('#account-toggle')?.addEventListener('click', toggleAccountMenu);
  root.querySelectorAll('[data-account-email]').forEach(button => button.addEventListener('click', () => switchAccount(button.dataset.accountEmail)));
  root.querySelector('#share')?.addEventListener('click', openShare);
  root.querySelector('#delete-document')?.addEventListener('click', deleteActiveDocument);
  if (state.active) attachEditor();
  startAccessWatch();
}

function toggleAccountMenu() {
  const menu = document.querySelector('#account-menu');
  const toggle = document.querySelector('#account-toggle');
  if (!menu || !toggle) return;
  menu.hidden = !menu.hidden;
  toggle.setAttribute('aria-expanded', String(!menu.hidden));
  if (!menu.hidden) menu.querySelector('[aria-current="true"]')?.focus();
}
async function logout() {
  try {
    if (!await flushPendingSave()) return;
    await api('/api/logout', { method: 'POST', body: '{}' });
    clearInterval(state.accessTimer); clearTimeout(state.timer);
    state.accessTimer = null; state.timer = null; state.active = null;
    state.documents = []; state.user = null; state.dirty = false;
    state.mobileSidebarOpen = false; state.sidebarCollapsed = false; state.saveError = false;
    renderLogin();
  } catch (error) { showToast(error.message, true); }
}
async function switchAccount(email) {
  if (state.users.find(user => user.email === email)?.id === state.user?.id) {
    document.querySelector('#account-menu').hidden = true;
    document.querySelector('#account-toggle').setAttribute('aria-expanded', 'false');
    return;
  }
  try {
    if (!await flushPendingSave()) return;
    clearInterval(state.accessTimer);
    state.active = null; state.documents = []; state.user = null;
    root.innerHTML = '<section class="loading-screen"><span class="loader"></span><p>Switching account…</p></section>';
    await api('/api/logout', { method: 'POST', body: '{}' });
    const data = await api('/api/login', { method: 'POST', body: JSON.stringify({ email }) });
    state.user = data.user;
    await refreshDocuments(false);
    state.active = null;
    state.mobileSidebarOpen = false;
    renderWorkspace();
    showToast(`Switched to ${state.user.name}.`);
  } catch (error) {
    state.active = null; state.user = null; state.documents = [];
    renderLogin(); showToast(error.message, true);
  }
}

function editorMarkup() {
  const editable = state.active.canEdit;
  const disabled = editable ? '' : 'disabled';
  const totalPages = countPages(state.active.content);
  return `<div class="editor-area"><div class="toolbar" role="toolbar" aria-label="Text formatting">
      <div class="tool-group"><select class="format-select" id="block-format" aria-label="Text style" ${disabled}><option value="p">Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="blockquote">Quote</option><option value="mixed" disabled>Mixed formatting</option></select></div>
      <span class="tool-sep"></span><div class="tool-group">
        <button class="tool-btn" data-command="bold" aria-label="Bold" title="Bold" aria-pressed="false" ${disabled}><b>B</b></button>
        <button class="tool-btn" data-command="italic" aria-label="Italic" title="Italic" aria-pressed="false" ${disabled}><i>I</i></button>
        <button class="tool-btn" data-command="underline" aria-label="Underline" title="Underline" aria-pressed="false" ${disabled}><u>U</u></button>
      </div><span class="tool-sep"></span><div class="tool-group">
        <button class="tool-btn" data-command="insertUnorderedList" aria-label="Bulleted list" title="Bulleted list" aria-pressed="false" ${disabled}>☷</button>
        <button class="tool-btn" data-command="insertOrderedList" aria-label="Numbered list" title="Numbered list" aria-pressed="false" ${disabled}>1.</button>
        <button class="tool-btn" data-command="formatBlock" data-value="blockquote" aria-label="Quote" title="Quote" aria-pressed="false" ${disabled}>❝</button>
      </div><span class="tool-sep"></span>
      <button class="tool-btn page-break-tool" id="insert-page-break" title="Insert page break" aria-label="Insert page break" ${disabled}>↵ Page break</button>
      <label class="tool-btn import-tool" for="import-file" title="Import a .txt or .md file" aria-label="Import .txt or .md" ${editable ? '' : 'aria-disabled="true"'}><span aria-hidden="true">↑</span><span>Import .txt / .md</span></label><input id="import-file" type="file" accept=".txt,.md,text/plain,text/markdown" ${disabled} hidden>
      <span class="page-count" aria-live="polite">${totalPages} ${totalPages === 1 ? 'page' : 'pages'}</span>
    </div>
    <article class="paper"><div class="editable" id="editor" contenteditable="${editable ? 'true' : 'false'}" role="textbox" aria-label="Document content" aria-multiline="true">${state.active.content || ''}</div></article>
    ${!editable ? '<p class="fine-print viewer-note">You have viewer access. Ask the owner for edit access to make changes.</p>' : '<p class="fine-print page-note">Pages advance automatically as you type. Insert a page break to start a page early.</p>'}
  </div>`;
}
function countPages(content) {
  const matches = String(content || '').match(/data-page-break\s*=\s*(?:"true"|'true'|true)/gi);
  return (matches?.length || 0) + 1;
}
function emptyMarkup() {
  return `<div class="empty-state"><div class="empty-icon">✳</div><div class="eyebrow">Your writing space</div><h2>A little room to think.</h2><p>Create a document to capture an idea, start a plan, or share a draft with someone you trust.</p><button class="primary-btn" id="empty-new">＋ Create your first document</button><div class="empty-upload"><span>Have a .txt or .md file?</span><label class="upload-link" for="empty-import-file">Upload a document</label><input id="empty-import-file" type="file" accept=".txt,.md,text/plain,text/markdown" hidden></div></div>`;
}

function markAncestor(node, tags, editor) {
  let element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
  while (element && element !== editor) {
    if (tags.includes(element.tagName.toLowerCase())) return true;
    element = element.parentElement;
  }
  return false;
}
function selectedTextNodes(range, editor) {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  const selected = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    let start = 0; let end = node.textContent.length;
    if (range.startContainer === node) start = range.startOffset;
    if (range.endContainer === node) end = range.endOffset;
    try {
      if ((range.collapsed && range.startContainer === node) || (range.intersectsNode(node) && end > start)) selected.push(node);
    } catch {}
  }
  return selected;
}
function valueForTags(nodes, tags, editor) {
  if (!nodes.length) return 'false';
  const values = nodes.map(node => markAncestor(node, tags, editor));
  if (values.every(Boolean)) return 'true';
  return values.some(Boolean) ? 'mixed' : 'false';
}
function selectedBlockType(nodes, editor) {
  if (!nodes.length) return 'p';
  const types = nodes.map(node => {
    let element = node.parentElement;
    while (element && element !== editor) {
      const tag = element.tagName.toLowerCase();
      if (['h1', 'h2', 'h3', 'p', 'blockquote'].includes(tag)) return tag;
      if (tag === 'li') return 'p';
      element = element.parentElement;
    }
    return 'p';
  });
  return types.every(type => type === types[0]) ? types[0] : 'mixed';
}
function updateToolbarState() {
  const editor = document.querySelector('#editor');
  const selection = window.getSelection();
  if (!editor || !selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;
  if (state.pendingMarksRange && (!range.collapsed || range.startContainer !== state.pendingMarksRange.startContainer || range.startOffset !== state.pendingMarksRange.startOffset)) {
    state.pendingMarks = null; state.pendingMarksRange = null;
  }
  state.selectionRange = range.cloneRange();
  const nodes = selectedTextNodes(range, editor);
  const markMap = { bold: ['strong', 'b'], italic: ['em', 'i'], underline: ['u'] };
  for (const button of document.querySelectorAll('.tool-btn[data-command]')) {
    let pressed = 'false';
    if (range.collapsed) {
      try {
        if (button.dataset.command === 'formatBlock') {
          const block = document.queryCommandValue('formatBlock').replace(/[<>]/g, '').toLowerCase();
          pressed = block === 'blockquote' ? 'true' : 'false';
        } else if (['bold', 'italic', 'underline'].includes(button.dataset.command) && state.pendingMarks) {
          pressed = state.pendingMarks[button.dataset.command] ? 'true' : 'false';
        } else pressed = document.queryCommandState(button.dataset.command) ? 'true' : 'false';
      } catch { pressed = 'false'; }
    } else if (markMap[button.dataset.command]) pressed = valueForTags(nodes, markMap[button.dataset.command], editor);
    else if (button.dataset.command === 'insertUnorderedList') pressed = valueForTags(nodes, ['ul'], editor);
    else if (button.dataset.command === 'insertOrderedList') pressed = valueForTags(nodes, ['ol'], editor);
    else if (button.dataset.command === 'formatBlock') pressed = valueForTags(nodes, ['blockquote'], editor);
    button.setAttribute('aria-pressed', pressed);
    button.classList.toggle('active', pressed === 'true');
    button.classList.toggle('mixed', pressed === 'mixed');
  }
  const block = document.querySelector('#block-format');
  if (block) block.value = selectedBlockType(nodes, editor);
}
function restoreEditorSelection(editor) {
  if (!state.selectionRange || !editor.contains(state.selectionRange.commonAncestorContainer)) return;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(state.selectionRange);
}
function refreshPageBreaks() {
  const editor = document.querySelector('#editor');
  if (!editor) return;
  const markers = [...editor.querySelectorAll('[data-page-break="true"]')];
  markers.forEach((marker, index) => {
    const pageNumber = String(index + 2);
    const label = `Page ${pageNumber}`;
    marker.classList.add('page-break');
    marker.setAttribute('contenteditable', 'false');
    marker.dataset.pageNumber = pageNumber;
    if (marker.dataset.label !== label) {
      marker.dataset.label = label;
      marker.innerHTML = `<span class="page-break-label">${label}</span><button type="button" class="page-break-remove" title="Remove page break" aria-label="Remove page break before page ${pageNumber}">×</button>`;
    }
  });
  const count = markers.length + 1;
  const badge = document.querySelector('.page-count');
  if (badge) badge.textContent = `${count} ${count === 1 ? 'page' : 'pages'}`;
}

function autoPaginateEditor() {
  const editor = document.querySelector('#editor');
  if (!editor || !state.active?.canEdit) return false;
  const pageHeight = Math.max(600, Math.min(982, editor.clientHeight || 982));
  const children = [...editor.children];
  let pageStart = 0;
  let inserted = false;
  for (const child of children) {
    const top = child.getBoundingClientRect().top - editor.getBoundingClientRect().top + editor.scrollTop;
    if (child.matches('[data-page-break="true"]')) {
      pageStart = child.getBoundingClientRect().bottom - editor.getBoundingClientRect().top + editor.scrollTop;
      continue;
    }
    if (top - pageStart >= pageHeight && child.previousElementSibling?.matches('[data-page-break="true"]') !== true) {
      const marker = document.createElement('div');
      marker.dataset.pageBreak = 'true';
      marker.setAttribute('contenteditable', 'false');
      editor.insertBefore(marker, child);
      inserted = true;
      pageStart = marker.getBoundingClientRect().bottom - editor.getBoundingClientRect().top + editor.scrollTop;
    }
  }
  if (inserted) refreshPageBreaks();
  return inserted;
}

function attachEditor() {
  const editor = document.querySelector('#editor');
  refreshPageBreaks();
  updateToolbarState();
  for (const button of document.querySelectorAll('.tool-btn[data-command]')) {
    button.addEventListener('pointerdown', event => event.preventDefault());
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', () => {
      if (!state.active?.canEdit) return;
      editor.focus();
      restoreEditorSelection(editor);
      const command = button.dataset.command;
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (range?.collapsed && ['bold', 'italic', 'underline'].includes(command)) {
        if (!state.pendingMarks) {
          state.pendingMarks = Object.fromEntries(['bold', 'italic', 'underline'].map(mark => [mark, document.queryCommandState(mark)]));
        }
        state.pendingMarks[command] = !state.pendingMarks[command];
      }
      if (command === 'formatBlock') document.execCommand(command, false, `<${button.dataset.value}>`);
      else document.execCommand(command, false, null);
      const nextSelection = window.getSelection();
      state.pendingMarksRange = range?.collapsed && nextSelection?.rangeCount ? nextSelection.getRangeAt(0).cloneRange() : null;
      updateToolbarState(); requestAnimationFrame(updateToolbarState); queueSave();
    });
  }
  document.querySelector('#block-format')?.addEventListener('change', event => {
    if (!state.active?.canEdit || event.target.value === 'mixed') return;
    editor.focus(); restoreEditorSelection(editor);
    document.execCommand('formatBlock', false, `<${event.target.value}>`);
    updateToolbarState(); requestAnimationFrame(updateToolbarState); queueSave();
  });
  document.querySelector('#insert-page-break')?.addEventListener('click', () => {
    if (!state.active?.canEdit) return;
    editor.focus(); restoreEditorSelection(editor);
    document.execCommand('insertHTML', false, '<div data-page-break="true" contenteditable="false"></div><p><br></p>');
    refreshPageBreaks(); updateToolbarState(); queueSave();
  });
  editor.addEventListener('click', event => {
    const remove = event.target.closest('.page-break-remove');
    if (!remove || !state.active?.canEdit) return;
    event.preventDefault();
    remove.closest('[data-page-break="true"]')?.remove();
    refreshPageBreaks(); queueSave(); editor.focus();
  });
  editor.addEventListener('input', () => {
    state.pendingMarks = null; state.pendingMarksRange = null;
    refreshPageBreaks();
    requestAnimationFrame(() => { if (autoPaginateEditor()) queueSave(); });
    updateToolbarState(); queueSave();
  });
  editor.addEventListener('keyup', () => { state.pendingMarks = null; state.pendingMarksRange = null; updateToolbarState(); });
  editor.addEventListener('mouseup', () => { state.pendingMarks = null; state.pendingMarksRange = null; updateToolbarState(); });
  editor.addEventListener('paste', event => {
    if (!state.active?.canEdit) return;
    event.preventDefault();
    document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
  });
  if (state.active.canEdit) document.querySelector('#doc-title').addEventListener('input', () => { state.dirty = true; setSaveStatus('Unsaved changes'); scheduleSave(700); });
  document.querySelector('#import-file')?.addEventListener('change', importFile);
}

document.addEventListener('selectionchange', updateToolbarState);
window.addEventListener('resize', syncSidebar);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (document.querySelector('.share-modal')) return;
    if (state.mobileSidebarOpen) closeSidebar();
    const menu = document.querySelector('#account-menu');
    if (menu && !menu.hidden) { menu.hidden = true; document.querySelector('#account-toggle')?.setAttribute('aria-expanded', 'false'); document.querySelector('#account-toggle')?.focus(); }
  }
});

function queueSave() {
  state.dirty = true; state.saveError = false; setSaveStatus('Unsaved changes'); scheduleSave(650);
}
function scheduleSave(delay) {
  clearTimeout(state.timer);
  state.timer = setTimeout(() => { state.timer = null; saveDocument(); }, delay);
}
async function saveDocument() {
  if (!state.active || !state.active.canEdit) return;
  if (state.saving) { state.dirty = true; return state.savePromise; }
  const editor = document.querySelector('#editor');
  const titleInput = document.querySelector('#doc-title');
  if (!editor || !titleInput) return;
  state.saving = true; state.dirty = false; setSaveStatus('Saving…');
  const documentId = state.active.id;
  const payload = { title: titleInput.value, content: editor.innerHTML };
  state.savePromise = (async () => {
    try {
      const data = await api(`/api/documents/${documentId}`, { method: 'PUT', body: JSON.stringify(payload) });
      state.saveError = false;
      if (state.active?.id === documentId) {
        state.active = { ...state.active, ...data.document };
        document.querySelector('#doc-title').value = state.active.title;
        setSaveStatus('Saved', 'saved');
        await refreshDocuments(true);
        const row = [...document.querySelectorAll('.doc-item')].find(item => item.dataset.id === documentId);
        if (row) row.querySelector('.doc-item-copy strong').textContent = data.document.title;
      } else await refreshDocuments(false);
    } catch (error) {
      state.saveError = true;
      if (state.active?.id === documentId) setSaveStatus('Save failed');
      showToast(error.message, true);
      if (error.status === 404) await loseDocumentAccess();
    } finally {
      state.saving = false; state.savePromise = null;
      if (state.dirty) scheduleSave(250);
    }
  })();
  return state.savePromise;
}
async function flushPendingSave() {
  if (!state.active?.canEdit) return true;
  while (state.saving || state.dirty) {
    clearTimeout(state.timer); state.timer = null;
    if (state.saving) await state.savePromise;
    else await saveDocument();
  }
  if (state.saveError) {
    showToast('Your changes could not be saved. Keep this document open and retry.', true);
    return false;
  }
  return true;
}
async function createDocument() {
  try {
    if (!await flushPendingSave()) return;
    const data = await api('/api/documents', { method: 'POST', body: JSON.stringify({ title: 'Untitled document' }) });
    await refreshDocuments(false); state.active = data.document; state.saveError = false; renderWorkspace(); document.querySelector('#doc-title')?.select();
  } catch (error) { showToast(error.message, true); }
}
async function openDocument(id) {
  try {
    if (!await flushPendingSave()) return;
    const data = await api(`/api/documents/${id}`);
    state.active = data.document; state.dirty = false; state.saveError = false; renderWorkspace();
    if (isMobile()) closeSidebar();
  } catch (error) {
    if (error.status === 404) { state.active = null; await refreshDocuments(false); renderWorkspace(); }
    showToast(error.message, true);
  }
}
async function importFile(event) {
  const file = event.target.files?.[0]; if (!file) return;
  if (!/\.(txt|md)$/i.test(file.name)) { showToast('Choose a .txt or .md file.', true); event.target.value = ''; return; }
  if (file.size > 1_000_000) { showToast('Files must be 1 MB or smaller.', true); event.target.value = ''; return; }
  try {
    if (!await flushPendingSave()) return;
    const data = await api('/api/import', { method: 'POST', body: JSON.stringify({ filename: file.name, mimeType: file.type, text: await file.text() }) });
    await refreshDocuments(false); state.active = data.document; state.saveError = false; renderWorkspace(); showToast('File imported into a new document.');
  } catch (error) { showToast(error.message, true); }
  event.target.value = '';
}

async function deleteActiveDocument() {
  if (!state.active || state.active.access !== 'owner') return;
  const { id, title } = state.active;
  if (!window.confirm(`Delete “${title}”? Collaborators will lose access and this document cannot be recovered.`)) return;
  const button = document.querySelector('#delete-document');
  if (button) { button.disabled = true; button.textContent = 'Deleting…'; }
  try {
    await api(`/api/documents/${id}`, { method: 'DELETE' });
    state.active = null; state.dirty = false; await refreshDocuments(false); renderWorkspace(); showToast(`“${title}” was deleted.`);
  } catch (error) {
    if (button) { button.disabled = false; button.textContent = 'Delete document'; }
    showToast(error.message, true);
  }
}

function openShare() {
  if (!state.active?.canShare) return;
  let currentDoc = state.active;
  const changes = new Map();
  const removals = new Set();
  let saving = false;
  const opener = document.querySelector('#share');
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<section class="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-heading" aria-describedby="share-description"><div class="modal-head"><div><h2 id="share-heading">Share document</h2><p id="share-description">Manage who can view or edit this document.</p></div><button class="icon-btn" id="modal-close" aria-label="Close share dialog">×</button></div><form class="share-form" id="share-form"><label for="share-person">Add a collaborator</label><select id="share-person" name="userId" required></select><select name="role" aria-label="Permission"><option value="editor">Can edit</option><option value="viewer">Can view</option></select><button class="secondary-btn" type="submit">Add to changes</button></form><div class="pending-banner" id="pending-banner" hidden>Unsaved sharing changes</div><div class="share-error" id="share-error" role="alert" hidden></div><div class="collab-title">People with access</div><div id="collaborators"></div><div class="permission-note">The owner cannot be removed. Access changes apply when you save.</div><div class="share-footer"><button class="secondary-btn" id="discard-share" type="button">Cancel</button><button class="primary-btn" id="save-sharing" type="button" disabled>Save changes</button></div></section>`;
  document.body.append(backdrop);
  const dialog = backdrop.querySelector('.share-modal');
  const savedShares = () => currentDoc.collaborators;
  const hasPending = () => changes.size > 0 || removals.size > 0;
  function refreshAddOptions() {
    const select = dialog.querySelector('#share-person');
    const existing = new Set(savedShares().map(item => item.user.id));
    const eligible = state.users.filter(user => user.id !== currentDoc.owner.id && (!existing.has(user.id) || removals.has(user.id)) && !changes.has(user.id));
    select.innerHTML = eligible.length
      ? eligible.map(user => `<option value="${escapeText(user.id)}">${escapeText(user.name)} · ${escapeText(user.email)}</option>`).join('')
      : '<option value="">Everyone listed already has access</option>';
    select.disabled = saving || !eligible.length;
    dialog.querySelector('#share-form button').disabled = saving || !eligible.length;
  }
  function renderCollaborators() {
    const saved = savedShares();
    const owner = `<div class="collab-row owner-row"><span class="avatar">${initials(currentDoc.owner)}</span><strong>${escapeText(currentDoc.owner.name)} (you)</strong><span class="role-label">Owner · cannot remove</span></div>`;
    const rows = saved.map(item => {
      const userId = item.user.id;
      if (removals.has(userId)) return `<div class="collab-row pending-removal"><span class="avatar">${initials(item.user)}</span><strong>${escapeText(item.user.name)}</strong><span class="role-label">Will lose access</span><button type="button" class="text-action" data-undo-remove="${escapeText(userId)}">Undo</button></div>`;
      const role = changes.get(userId) || item.role;
      const pending = role !== item.role;
      return `<div class="collab-row"><span class="avatar">${initials(item.user)}</span><span class="collab-person"><strong>${escapeText(item.user.name)}</strong><small>${escapeText(item.user.email)}</small></span><select aria-label="Permission for ${escapeText(item.user.name)}" data-role-user="${escapeText(userId)}" ${saving ? 'disabled' : ''}><option value="editor" ${role === 'editor' ? 'selected' : ''}>Can edit</option><option value="viewer" ${role === 'viewer' ? 'selected' : ''}>Can view</option></select>${pending ? '<span class="pending-tag">Unsaved</span>' : ''}<button type="button" class="text-action danger-text" data-remove-user="${escapeText(userId)}" ${saving ? 'disabled' : ''}>Remove access</button></div>`;
    }).join('');
    const adds = [...changes].filter(([id]) => !saved.some(item => item.user.id === id)).map(([id, role]) => {
      const user = state.users.find(candidate => candidate.id === id);
      if (!user) return '';
      return `<div class="collab-row pending-add"><span class="avatar">${initials(user)}</span><span class="collab-person"><strong>${escapeText(user.name)}</strong><small>${escapeText(user.email)}</small></span><select aria-label="Permission for ${escapeText(user.name)}" data-role-user="${escapeText(id)}" ${saving ? 'disabled' : ''}><option value="editor" ${role === 'editor' ? 'selected' : ''}>Can edit</option><option value="viewer" ${role === 'viewer' ? 'selected' : ''}>Can view</option></select><span class="pending-tag">Pending</span><button type="button" class="text-action danger-text" data-cancel-add="${escapeText(id)}" ${saving ? 'disabled' : ''}>Remove</button></div>`;
    }).join('');
    dialog.querySelector('#collaborators').innerHTML = `${owner}${rows}${adds || (!rows ? '<p class="fine-print">No collaborators yet.</p>' : '')}`;
    for (const select of dialog.querySelectorAll('[data-role-user]')) select.addEventListener('change', () => {
      const userId = select.dataset.roleUser;
      const original = saved.find(item => item.user.id === userId);
      if (original && original.role === select.value) changes.delete(userId);
      else changes.set(userId, select.value);
      updatePending(); renderCollaborators();
    });
    dialog.querySelectorAll('[data-remove-user]').forEach(button => button.addEventListener('click', () => {
      const user = state.users.find(candidate => candidate.id === button.dataset.removeUser);
      if (!window.confirm(`Remove ${user.name}’s access? The change will take effect when you save.`)) return;
      removals.add(user.id); changes.delete(user.id); updatePending(); renderCollaborators();
    }));
    dialog.querySelectorAll('[data-undo-remove]').forEach(button => button.addEventListener('click', () => { removals.delete(button.dataset.undoRemove); updatePending(); renderCollaborators(); }));
    dialog.querySelectorAll('[data-cancel-add]').forEach(button => button.addEventListener('click', () => { changes.delete(button.dataset.cancelAdd); updatePending(); renderCollaborators(); }));
  }
  function updatePending() {
    const pending = hasPending();
    dialog.querySelector('#pending-banner').hidden = !pending;
    const save = dialog.querySelector('#save-sharing');
    save.disabled = !pending || saving;
    save.textContent = saving ? 'Saving…' : 'Save changes';
    for (const control of dialog.querySelectorAll('select, #discard-share')) control.disabled = saving;
    refreshAddOptions();
  }
  function closeDialog() {
    if (hasPending() && !window.confirm('Discard unsaved sharing changes?')) return;
    backdrop.remove(); opener?.focus();
  }
  refreshAddOptions(); renderCollaborators(); updatePending();
  dialog.querySelector('#modal-close').addEventListener('click', closeDialog);
  dialog.querySelector('#discard-share').addEventListener('click', closeDialog);
  backdrop.addEventListener('click', event => { if (event.target === backdrop) closeDialog(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeDialog(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex="0"]')]
      .filter(node => !node.hidden && node.getAttribute('aria-hidden') !== 'true');
    if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
  dialog.querySelector('#share-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const userId = String(form.get('userId') || '');
    if (!userId) return;
    changes.set(userId, String(form.get('role')));
    removals.delete(userId);
    dialog.querySelector('#share-error').hidden = true;
    updatePending(); renderCollaborators();
  });
  dialog.querySelector('#save-sharing').addEventListener('click', async () => {
    if (!hasPending() || saving) return;
    saving = true; dialog.querySelector('#share-error').hidden = true; updatePending(); renderCollaborators();
    try {
      const result = await api(`/api/documents/${currentDoc.id}/share`, {
        method: 'PUT', body: JSON.stringify({ changes: [...changes].map(([userId, role]) => ({ userId, role })), removeUserIds: [...removals] }),
      });
      currentDoc = result.document; state.active = result.document; changes.clear(); removals.clear();
      await refreshDocuments(true);
      saving = false; updatePending(); renderCollaborators();
      showToast('Sharing settings saved.');
    } catch (error) {
      saving = false; updatePending(); renderCollaborators();
      const errorNode = dialog.querySelector('#share-error');
      errorNode.textContent = `${error.message} Your changes are still here; you can retry.`;
      errorNode.hidden = false;
    }
  });
  dialog.querySelector('#modal-close').focus();
}

async function loseDocumentAccess() {
  clearInterval(state.accessTimer); state.accessTimer = null;
  state.active = null; state.dirty = false; clearTimeout(state.timer);
  try { await refreshDocuments(false); } catch {}
  if (state.user) renderWorkspace(); else renderLogin();
  showToast('This document is no longer shared with your account.', true);
}
async function revalidateActiveAccess() {
  if (!state.active || state.active.access === 'owner' || document.visibilityState !== 'visible') return;
  const id = state.active.id;
  try {
    const data = await api(`/api/documents/${id}`);
    if (state.active?.id !== id) return;
    if (data.document.canEdit !== state.active.canEdit || data.document.access !== state.active.access) {
      const hadUnsavedEdits = state.dirty;
      const unsavedContent = hadUnsavedEdits ? document.querySelector('#editor')?.innerHTML : null;
      state.active = hadUnsavedEdits && unsavedContent != null
        ? { ...data.document, content: unsavedContent }
        : data.document;
      if (hadUnsavedEdits && !data.document.canEdit) {
        state.dirty = false; clearTimeout(state.timer); state.timer = null;
      }
      renderWorkspace();
      showToast(hadUnsavedEdits && !data.document.canEdit
        ? 'Edit access changed. Your unsaved text is still visible here; copy it before leaving this document.'
        : data.document.canEdit ? 'Edit access was updated.' : 'Your access is now view-only.');
    }
  } catch (error) {
    if (error.status === 404 || error.status === 403) await loseDocumentAccess();
    else if (error.status === 401) { state.user = null; state.active = null; renderLogin(); }
  }
}
function startAccessWatch() {
  clearInterval(state.accessTimer); state.accessTimer = null;
  if (state.active && state.active.access !== 'owner') state.accessTimer = setInterval(revalidateActiveAccess, 15000);
}
document.addEventListener('visibilitychange', revalidateActiveAccess);

async function init() {
  try {
    const data = await api('/api/me'); state.users = data.users; state.user = data.user;
    if (state.user) { await refreshDocuments(false); renderWorkspace(); }
    else renderLogin();
  } catch (error) {
    root.innerHTML = `<div class="empty-state"><div class="eyebrow">Workspace unavailable</div><h2>We couldn’t open your documents.</h2><p>${escapeText(error.message)}</p><button class="primary-btn" id="retry">Try again</button></div>`;
    document.querySelector('#retry')?.addEventListener('click', init);
  }
}
init();
