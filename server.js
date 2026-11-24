const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'store.json');
const MAX_BODY = 7_000_000;
const MAX_DOC = 8_000_000;
const MAX_UPLOAD = 1_000_000;
const MAX_VERSIONS = 20;
const COOKIE = 'ajaia_session';
const USERS = [
  { id: 'user_alex', email: 'alex@ajaia.demo', name: 'Alex Morgan' },
  { id: 'user_jamie', email: 'jamie@ajaia.demo', name: 'Jamie Lee' },
  { id: 'user_taylor', email: 'taylor@ajaia.demo', name: 'Taylor Kim' },
];
const sessions = new Map();
let writeQueue = Promise.resolve();

async function readStore() {
  try {
    const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
    if (!Array.isArray(data.documents)) throw new Error('Invalid document store');
    return data;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { documents: [] };
  }
}

async function saveStore(store) {
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    const temporary = `${DATA_FILE}.${process.pid}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(store, null, 2), 'utf8');
    await fs.rename(temporary, DATA_FILE);
  });
  return writeQueue;
}

function cleanHtml(value) {
  if (typeof value !== 'string' || value.length > MAX_DOC) throw httpError(400, 'Document content is too large or invalid.');
  return value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<div\b(?=[^>]*\bdata-page-break\s*=\s*(?:"true"|'true'|true))[^>]*>[\s\S]*?<\/div\s*>/gi, '<div data-page-break="true" contenteditable="false"></div>')
    .replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (tag, name) => {
      const allowed = new Set(['p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote']);
      const normalized = name.toLowerCase();
      if (!allowed.has(normalized)) return '';
      const closing = /^<\s*\//.test(tag);
      if (!closing && normalized === 'div' && /\bdata-page-break\s*=\s*(?:"true"|'true'|true)/i.test(tag)) return '<div data-page-break="true" contenteditable="false">';
      return normalized === 'br' ? '<br>' : `<${closing ? '/' : ''}${normalized}>`;
    });
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function mdInline(text) {
  const escaped = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<u>$1</u>');
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const out = [];
  let list = null;
  const closeList = () => { if (list) out.push(`</${list}>`); list = null; };
  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    const bullet = /^\s*[-*+]\s+(.+)$/.exec(line);
    const number = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    if (!line.trim()) { closeList(); continue; }
    if (heading) { closeList(); const level = heading[1].length; out.push(`<h${level}>${mdInline(heading[2])}</h${level}>`); continue; }
    if (bullet || number) {
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) { closeList(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${mdInline((bullet || number)[1])}</li>`);
      continue;
    }
    closeList(); out.push(`<p>${mdInline(line)}</p>`);
  }
  closeList();
  return out.join('');
}

async function bodyJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw httpError(413, 'Request is too large.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw httpError(400, 'Request body must be valid JSON.'); }
}

function send(res, status, payload, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(JSON.stringify(payload));
}

function currentUser(req) {
  const cookie = req.headers.cookie || '';
  const token = cookie.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  return token ? sessions.get(token) || null : null;
}

function canRead(doc, user) {
  return doc.ownerId === user.id || Boolean(doc.shares?.some(share => share.userId === user.id));
}

function canEdit(doc, user) {
  return doc.ownerId === user.id || Boolean(doc.shares?.some(share => share.userId === user.id && share.role === 'editor'));
}

function canShare(doc, user) { return doc.ownerId === user.id; }

function publicDoc(doc, user) {
  const owner = USERS.find(candidate => candidate.id === doc.ownerId);
  const myShare = doc.shares?.find(share => share.userId === user.id);
  return {
    id: doc.id, title: doc.title, content: doc.content,
    createdAt: doc.createdAt, updatedAt: doc.updatedAt,
    owner: owner ? { id: owner.id, name: owner.name, email: owner.email } : null,
    access: doc.ownerId === user.id ? 'owner' : myShare?.role,
    canEdit: canEdit(doc, user), canShare: canShare(doc, user),
    comments: (doc.comments || []).map(comment => ({ ...comment })),
    suggestions: (doc.suggestions || []).map(suggestion => ({ ...suggestion })),
    versions: (doc.versions || []).map(({ id, title, createdAt, createdBy }) => ({ id, title, createdAt, createdBy })),
    collaborators: doc.shares?.map(share => ({
      user: USERS.find(candidate => candidate.id === share.userId), role: share.role,
    })).filter(share => share.user).map(share => ({ user: { id: share.user.id, name: share.user.name, email: share.user.email }, role: share.role })) || [],
  };
}

function snapshot(doc, user, title, force = false) {
  const versions = doc.versions || (doc.versions = []);
  const latest = versions.at(-1);
  if (!force && latest && latest.title === doc.title && latest.content === doc.content) return latest;
  const version = {
    id: crypto.randomUUID(), title: title || doc.title, content: doc.content,
    createdAt: new Date().toISOString(), createdBy: { id: user.id, name: user.name },
  };
  versions.push(version);
  if (versions.length > MAX_VERSIONS) versions.splice(0, versions.length - MAX_VERSIONS);
  return version;
}

function safeTitle(value) {
  if (typeof value !== 'string') throw httpError(400, 'Title is required.');
  const title = value.trim();
  if (!title || title.length > 120) throw httpError(400, 'Title must be between 1 and 120 characters.');
  return title;
}

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    try {
      if (req.method === 'GET' && pathname === '/api/health') {
        return send(res, 200, { ok: true, mode: 'demo' });
      }
      if (req.method === 'GET' && pathname === '/api/me') {
        const user = currentUser(req);
        return send(res, 200, { user: user ? { id: user.id, name: user.name, email: user.email } : null, users: USERS.map(({ id, name, email }) => ({ id, name, email })) });
      }
      if (req.method === 'POST' && pathname === '/api/login') {
        const body = await bodyJson(req);
        const user = USERS.find(candidate => candidate.email.toLowerCase() === String(body.email || '').toLowerCase());
        if (!user) throw httpError(400, 'Choose one of the listed demo accounts.');
        const token = crypto.randomBytes(32).toString('base64url');
        sessions.set(token, user);
        return send(res, 200, { user: { id: user.id, name: user.name, email: user.email } }, {
          'Set-Cookie': `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
        });
      }
      if (req.method === 'POST' && pathname === '/api/logout') {
        const cookie = req.headers.cookie || '';
        const token = cookie.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
        if (token) sessions.delete(token);
        return send(res, 200, { ok: true }, { 'Set-Cookie': `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` });
      }
      const user = currentUser(req);
      if (pathname.startsWith('/api/') && !user) throw httpError(401, 'Sign in to continue.');

      if (req.method === 'GET' && pathname === '/api/documents') {
        const store = await readStore();
        const docs = store.documents.filter(doc => canRead(doc, user)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        return send(res, 200, { documents: docs.map(doc => publicDoc({ ...doc, content: '' }, user)) });
      }
      if (req.method === 'POST' && pathname === '/api/documents') {
        const body = await bodyJson(req);
        const doc = { id: crypto.randomUUID(), title: safeTitle(body.title || 'Untitled document'), content: '', ownerId: user.id, shares: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        const store = await readStore(); store.documents.push(doc); await saveStore(store);
        return send(res, 201, { document: publicDoc(doc, user) });
      }
      if (req.method === 'POST' && pathname === '/api/import') {
        const body = await bodyJson(req);
        const filename = String(body.filename || '');
        const extension = path.extname(filename).toLowerCase();
        if (!['.txt', '.md'].includes(extension)) throw httpError(415, 'Supported formats are .txt and .md.');
        const mimeType = String(body.mimeType || '').toLowerCase();
        const validMime = extension === '.txt'
          ? ['text/plain']
          : ['text/plain', 'text/markdown', 'text/x-markdown'];
        if (mimeType && !validMime.includes(mimeType)) throw httpError(415, 'The file content type does not match a supported text format.');
        if (typeof body.text !== 'string' || Buffer.byteLength(body.text, 'utf8') > MAX_UPLOAD) throw httpError(413, 'Files must be 1 MB or smaller.');
        const content = extension === '.md' ? markdownToHtml(body.text) : body.text.split(/\r?\n/).map(line => `<p>${line.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') || '<br>'}</p>`).join('');
        const doc = { id: crypto.randomUUID(), title: safeTitle(path.basename(filename, extension) || 'Imported document'), content: cleanHtml(content), ownerId: user.id, shares: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        const store = await readStore(); store.documents.push(doc); await saveStore(store);
        return send(res, 201, { document: publicDoc(doc, user) });
      }
      const reviewRoute = /^\/api\/documents\/([0-9a-f-]{36})\/(comments|suggestions|versions)(?:\/([0-9a-f-]{36}))?$/.exec(pathname);
      if (reviewRoute) {
        const [, id, kind, itemId] = reviewRoute;
        const store = await readStore();
        const doc = store.documents.find(candidate => candidate.id === id);
        if (!doc || !canRead(doc, user)) throw httpError(404, 'Document not found.');
        doc.comments ||= []; doc.suggestions ||= []; doc.versions ||= [];
        if (kind === 'versions' && req.method === 'GET') {
          return send(res, 200, { versions: doc.versions.map(({ id: versionId, title, createdAt, createdBy }) => ({ id: versionId, title, createdAt, createdBy })) });
        }
        if (kind === 'versions' && req.method === 'POST' && !itemId) {
          if (!canEdit(doc, user)) throw httpError(403, 'Edit access is required to save a version.');
          const body = await bodyJson(req);
          const version = snapshot(doc, user, body.label ? safeTitle(body.label) : doc.title, true);
          if (!doc.versions.includes(version)) doc.versions.push(version);
          if (doc.versions.length > MAX_VERSIONS) doc.versions.splice(0, doc.versions.length - MAX_VERSIONS);
          await saveStore(store);
          return send(res, 201, { version: { id: version.id, title: version.title, createdAt: version.createdAt, createdBy: version.createdBy } });
        }
        if (kind === 'versions' && req.method === 'POST' && itemId) {
          if (!canEdit(doc, user)) throw httpError(403, 'Edit access is required to restore a version.');
          const version = doc.versions.find(candidate => candidate.id === itemId);
          if (!version) throw httpError(404, 'Version not found.');
          snapshot(doc, user, 'Before restore');
          doc.title = version.title; doc.content = cleanHtml(version.content); doc.updatedAt = new Date().toISOString();
          await saveStore(store);
          return send(res, 200, { document: publicDoc(doc, user) });
        }
        if (kind === 'comments' && req.method === 'POST' && !itemId) {
          const body = await bodyJson(req); const text = String(body.text || '').trim();
          if (!text || text.length > 2000) throw httpError(400, 'Comment must be between 1 and 2,000 characters.');
          const comment = { id: crypto.randomUUID(), text, anchor: String(body.anchor || '').trim().slice(0, 500), authorId: user.id, authorName: user.name, createdAt: new Date().toISOString() };
          doc.comments.push(comment); await saveStore(store);
          return send(res, 201, { comment });
        }
        if (kind === 'comments' && req.method === 'DELETE' && itemId) {
          const comment = doc.comments.find(candidate => candidate.id === itemId);
          if (!comment) throw httpError(404, 'Comment not found.');
          if (comment.authorId !== user.id && !canEdit(doc, user)) throw httpError(403, 'Only the comment author or an editor can remove it.');
          doc.comments = doc.comments.filter(candidate => candidate.id !== itemId); await saveStore(store);
          return send(res, 200, { deleted: true });
        }
        if (kind === 'suggestions' && req.method === 'POST' && !itemId) {
          const body = await bodyJson(req); const originalText = String(body.originalText || '').trim(); const proposedText = String(body.proposedText || '').trim();
          if (!originalText || originalText.length > 2000 || !proposedText || proposedText.length > 2000) throw httpError(400, 'Select up to 2,000 characters and provide a replacement.');
          const suggestion = { id: crypto.randomUUID(), originalText, proposedText, note: String(body.note || '').trim().slice(0, 1000), authorId: user.id, authorName: user.name, status: 'pending', createdAt: new Date().toISOString() };
          doc.suggestions.push(suggestion); await saveStore(store);
          return send(res, 201, { suggestion });
        }
        if (kind === 'suggestions' && req.method === 'PUT' && itemId) {
          if (!canEdit(doc, user)) throw httpError(403, 'Edit access is required to review suggestions.');
          const suggestion = doc.suggestions.find(candidate => candidate.id === itemId);
          if (!suggestion || suggestion.status !== 'pending') throw httpError(404, 'Pending suggestion not found.');
          const body = await bodyJson(req);
          if (body.action === 'accept') {
            if (typeof body.content !== 'string') throw httpError(400, 'Updated document content is required.');
            snapshot(doc, user, 'Before suggestion');
            doc.content = cleanHtml(body.content); doc.updatedAt = new Date().toISOString();
          } else if (body.action !== 'reject') throw httpError(400, 'Choose accept or reject.');
          suggestion.status = body.action === 'accept' ? 'accepted' : 'rejected'; suggestion.resolvedAt = new Date().toISOString(); suggestion.resolvedBy = user.name;
          await saveStore(store);
          return send(res, 200, { document: publicDoc(doc, user), suggestion });
        }
        throw httpError(405, 'Method not allowed.');
      }
      const match = /^\/api\/documents\/([0-9a-f-]{36})(?:\/(share))?$/.exec(pathname);
      if (match) {
        const [, id, shareRoute] = match;
        const store = await readStore();
        const doc = store.documents.find(candidate => candidate.id === id);
        if (!doc || !canRead(doc, user)) throw httpError(404, 'Document not found.');
        if (!shareRoute && req.method === 'GET') return send(res, 200, { document: publicDoc(doc, user) });
        if (!shareRoute && req.method === 'PUT') {
          if (!canEdit(doc, user)) throw httpError(403, 'You have view-only access.');
          const body = await bodyJson(req);
          if (body.title !== undefined) doc.title = safeTitle(body.title);
          if (body.content !== undefined) doc.content = cleanHtml(body.content);
          doc.updatedAt = new Date().toISOString(); await saveStore(store);
          return send(res, 200, { document: publicDoc(doc, user) });
        }
        if (!shareRoute && req.method === 'DELETE') {
          if (doc.ownerId !== user.id) throw httpError(403, 'Only the owner can delete this document.');
          store.documents = store.documents.filter(candidate => candidate.id !== id);
          await saveStore(store);
          return send(res, 200, { deleted: true });
        }
        if (shareRoute && req.method === 'POST') {
          if (!canShare(doc, user)) throw httpError(403, 'Only the owner can manage sharing.');
          const body = await bodyJson(req);
          const target = USERS.find(candidate => candidate.email.toLowerCase() === String(body.email || '').toLowerCase());
          if (!target) throw httpError(400, 'Choose a listed demo user.');
          if (target.id === doc.ownerId) throw httpError(400, 'The owner already has access.');
          const role = body.role === 'viewer' ? 'viewer' : body.role === 'editor' ? 'editor' : null;
          if (!role) throw httpError(400, 'Choose viewer or editor access.');
          const existing = doc.shares.find(share => share.userId === target.id);
          if (existing) existing.role = role; else doc.shares.push({ userId: target.id, role });
          doc.updatedAt = new Date().toISOString(); await saveStore(store);
          return send(res, 200, { document: publicDoc(doc, user) });
        }
        if (shareRoute && req.method === 'PUT') {
          if (!canShare(doc, user)) throw httpError(403, 'Only the owner can manage sharing.');
          const body = await bodyJson(req);
          if (!Array.isArray(body.changes) || !Array.isArray(body.removeUserIds)) throw httpError(400, 'Sharing changes are invalid.');
          if (body.changes.length + body.removeUserIds.length > USERS.length) throw httpError(400, 'Too many sharing changes.');
          const removals = new Set();
          for (const idToRemove of body.removeUserIds) {
            const target = USERS.find(candidate => candidate.id === idToRemove);
            if (!target || target.id === doc.ownerId) throw httpError(400, 'The owner cannot be removed.');
            removals.add(target.id);
          }
          const nextShares = new Map((doc.shares || []).filter(share => !removals.has(share.userId)).map(share => [share.userId, share.role]));
          for (const change of body.changes) {
            const target = USERS.find(candidate => candidate.id === change.userId);
            const role = change.role === 'viewer' || change.role === 'editor' ? change.role : null;
            if (!target || target.id === doc.ownerId || !role || removals.has(target.id)) throw httpError(400, 'A sharing change is invalid.');
            nextShares.set(target.id, role);
          }
          doc.shares = [...nextShares].map(([userId, role]) => ({ userId, role }));
          doc.updatedAt = new Date().toISOString();
          await saveStore(store);
          return send(res, 200, { document: publicDoc(doc, user) });
        }
        if (shareRoute && req.method === 'DELETE') {
          if (!canShare(doc, user)) throw httpError(403, 'Only the owner can manage sharing.');
          const body = await bodyJson(req);
          doc.shares = doc.shares.filter(share => share.userId !== body.userId);
          doc.updatedAt = new Date().toISOString(); await saveStore(store);
          return send(res, 200, { document: publicDoc(doc, user) });
        }
      }
      if (pathname.startsWith('/api/')) throw httpError(404, 'API route not found.');
      if (req.method !== 'GET' && req.method !== 'HEAD') throw httpError(405, 'Method not allowed.');
      const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
      const filePath = path.resolve(__dirname, 'public', relative);
      if (!filePath.startsWith(path.resolve(__dirname, 'public') + path.sep)) throw httpError(404, 'Not found.');
      let data;
      try { data = await fs.readFile(filePath); } catch { throw httpError(404, 'Not found.'); }
      const type = filePath.endsWith('.css') ? 'text/css' : filePath.endsWith('.js') ? 'text/javascript' : 'text/html';
      res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8`, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'" });
      return req.method === 'HEAD' ? res.end() : res.end(data);
    } catch (error) {
      if (error.code === 'ENOENT') console.error('Data store unavailable:', error.message);
      return send(res, error.status || 500, { error: error.status ? error.message : 'An unexpected server error occurred.' });
    }
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, () => console.log(`Ajaia Docs listening on http://localhost:${PORT}`));
}

module.exports = { createServer, cleanHtml, markdownToHtml, canRead, canEdit, USERS };
