const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const temporaryDirectory = path.join(os.tmpdir(), `ajaia-docs-test-${process.pid}-${Date.now()}`);
process.env.DATA_FILE = path.join(temporaryDirectory, 'store.json');
const { createServer, cleanHtml } = require('../server');

test('stored content keeps formatting while removing scripts, attributes, and unsupported tags', () => {
  const safe = cleanHtml('<h1 onclick="steal()">Heading</h1><script>alert(1)</script><img src=x onerror=alert(2)><p>Text</p>');
  assert.equal(safe, '<h1>Heading</h1><p>Text</p>');
  assert.equal(cleanHtml('<div data-page-break="true" contenteditable="true">Page 1 · Page 2<button>Remove</button></div>'), '<div data-page-break="true" contenteditable="false"></div>');
});

test('document access is private until shared, and viewer edits are denied', async t => {
  await fs.mkdir(temporaryDirectory, { recursive: true });
  let server;
  let origin;
  async function startServer() {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
  }
  await startServer();
  t.after(async () => {
    if (server?.listening) await new Promise(resolve => server.close(resolve));
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  });

  async function login(email) {
    const response = await fetch(`${origin}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
    assert.equal(response.status, 200);
    return response.headers.get('set-cookie').split(';')[0];
  }
  const alex = await login('alex@ajaia.demo');
  const create = await fetch(`${origin}/api/documents`, { method: 'POST', headers: { cookie: alex, 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Private notes' }) });
  assert.equal(create.status, 201);
  const { document } = await create.json();
  const ownerEdit = await fetch(`${origin}/api/documents/${document.id}`, { method: 'PUT', headers: { cookie: alex, 'content-type': 'application/json' }, body: JSON.stringify({ content: '<p>Saved across a restart.</p>' }) });
  assert.equal(ownerEdit.status, 200);
  const autoHistory = await fetch(`${origin}/api/documents/${document.id}/versions`, { headers: { cookie: alex } });
  assert.equal((await autoHistory.json()).versions.length, 1);

  const jamie = await login('jamie@ajaia.demo');
  const privateRead = await fetch(`${origin}/api/documents/${document.id}`, { headers: { cookie: jamie } });
  assert.equal(privateRead.status, 404);

  const share = await fetch(`${origin}/api/documents/${document.id}/share`, { method: 'POST', headers: { cookie: alex, 'content-type': 'application/json' }, body: JSON.stringify({ email: 'jamie@ajaia.demo', role: 'viewer' }) });
  assert.equal(share.status, 200);
  const sharedRead = await fetch(`${origin}/api/documents/${document.id}`, { headers: { cookie: jamie } });
  assert.equal(sharedRead.status, 200);
  const sharedDocument = (await sharedRead.json()).document;
  assert.equal(sharedDocument.canEdit, false);
  assert.equal(sharedDocument.owner.name, 'Alex Morgan');
  assert.equal(sharedDocument.access, 'viewer');

  const viewerEdit = await fetch(`${origin}/api/documents/${document.id}`, { method: 'PUT', headers: { cookie: jamie, 'content-type': 'application/json' }, body: JSON.stringify({ content: '<p>Not allowed</p>' }) });
  assert.equal(viewerEdit.status, 403);

  const comment = await fetch(`${origin}/api/documents/${document.id}/comments`, { method: 'POST', headers: { cookie: jamie, 'content-type': 'application/json' }, body: JSON.stringify({ text: 'Consider this paragraph.', anchor: 'Saved across a restart.' }) });
  assert.equal(comment.status, 201);
  const suggestion = await fetch(`${origin}/api/documents/${document.id}/suggestions`, { method: 'POST', headers: { cookie: jamie, 'content-type': 'application/json' }, body: JSON.stringify({ originalText: 'Saved across a restart.', proposedText: 'Saved in the document store.' }) });
  assert.equal(suggestion.status, 201);
  const suggestionId = (await suggestion.json()).suggestion.id;
  assert.equal((await fetch(`${origin}/api/documents/${document.id}/suggestions/${suggestionId}`, { method: 'PUT', headers: { cookie: jamie, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'reject' }) })).status, 403);
  assert.equal((await fetch(`${origin}/api/documents/${document.id}/versions`, { method: 'POST', headers: { cookie: jamie, 'content-type': 'application/json' }, body: JSON.stringify({ label: 'No access' }) })).status, 403);

  const checkpoint = await fetch(`${origin}/api/documents/${document.id}/versions`, { method: 'POST', headers: { cookie: alex, 'content-type': 'application/json' }, body: JSON.stringify({ label: 'First draft' }) });
  assert.equal(checkpoint.status, 201);
  const versionId = (await checkpoint.json()).version.id;
  await fetch(`${origin}/api/documents/${document.id}`, { method: 'PUT', headers: { cookie: alex, 'content-type': 'application/json' }, body: JSON.stringify({ content: '<p>Changed draft.</p>' }) });
  const restored = await fetch(`${origin}/api/documents/${document.id}/versions/${versionId}`, { method: 'POST', headers: { cookie: alex, 'content-type': 'application/json' }, body: '{}' });
  assert.equal(restored.status, 200);
  assert.equal((await restored.json()).document.content, '<p>Saved across a restart.</p>');
  const accepted = await fetch(`${origin}/api/documents/${document.id}/suggestions/${suggestionId}`, { method: 'PUT', headers: { cookie: alex, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'accept', content: '<p>Saved in the document store.</p>' }) });
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).document.content, '<p>Saved in the document store.</p>');

  const unauthorizedShare = await fetch(`${origin}/api/documents/${document.id}/share`, { method: 'POST', headers: { cookie: jamie, 'content-type': 'application/json' }, body: JSON.stringify({ email: 'taylor@ajaia.demo', role: 'editor' }) });
  assert.equal(unauthorizedShare.status, 403);
  const unauthorizedBatch = await fetch(`${origin}/api/documents/${document.id}/share`, { method: 'PUT', headers: { cookie: jamie, 'content-type': 'application/json' }, body: JSON.stringify({ changes: [], removeUserIds: ['user_jamie'] }) });
  assert.equal(unauthorizedBatch.status, 403);
  const unauthorizedDelete = await fetch(`${origin}/api/documents/${document.id}`, { method: 'DELETE', headers: { cookie: jamie } });
  assert.equal(unauthorizedDelete.status, 403);

  const unrelated = await fetch(`${origin}/api/documents`, { method: 'POST', headers: { cookie: alex, 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Keep this document' }) });
  assert.equal(unrelated.status, 201);
  const unrelatedId = (await unrelated.json()).document.id;
  const updateRole = await fetch(`${origin}/api/documents/${document.id}/share`, { method: 'PUT', headers: { cookie: alex, 'content-type': 'application/json' }, body: JSON.stringify({ changes: [{ userId: 'user_jamie', role: 'editor' }], removeUserIds: [] }) });
  assert.equal(updateRole.status, 200);
  assert.equal((await updateRole.json()).document.collaborators[0].role, 'editor');
  const revoke = await fetch(`${origin}/api/documents/${document.id}/share`, { method: 'PUT', headers: { cookie: alex, 'content-type': 'application/json' }, body: JSON.stringify({ changes: [], removeUserIds: ['user_jamie'] }) });
  assert.equal(revoke.status, 200);
  assert.equal((await revoke.json()).document.collaborators.length, 0);
  const revokedRead = await fetch(`${origin}/api/documents/${document.id}`, { headers: { cookie: jamie } });
  assert.equal(revokedRead.status, 404);
  const ownerAfterRevoke = await fetch(`${origin}/api/documents/${document.id}`, { headers: { cookie: alex } });
  assert.equal(ownerAfterRevoke.status, 200);

  const imported = await fetch(`${origin}/api/import`, { method: 'POST', headers: { cookie: alex, 'content-type': 'application/json' }, body: JSON.stringify({ filename: 'notes.md', mimeType: 'text/markdown', text: '# Imported\n\n**A formatted note**' }) });
  assert.equal(imported.status, 201);
  assert.match((await imported.json()).document.content, /<h1>Imported<\/h1>/);
  const importedText = await fetch(`${origin}/api/import`, { method: 'POST', headers: { cookie: alex, 'content-type': 'application/json' }, body: JSON.stringify({ filename: 'notes.txt', mimeType: 'text/plain', text: 'First line\ncontinued line\n\nSecond paragraph <safe>' }) });
  assert.equal(importedText.status, 201);
  assert.equal((await importedText.json()).document.content, '<p>First line<br>continued line</p><p>Second paragraph &lt;safe&gt;</p>');
  const unsupported = await fetch(`${origin}/api/import`, { method: 'POST', headers: { cookie: alex, 'content-type': 'application/json' }, body: JSON.stringify({ filename: 'notes.docx', text: 'not supported' }) });
  assert.equal(unsupported.status, 415);
  const wrongMime = await fetch(`${origin}/api/import`, { method: 'POST', headers: { cookie: alex, 'content-type': 'application/json' }, body: JSON.stringify({ filename: 'notes.md', mimeType: 'application/pdf', text: 'not markdown' }) });
  assert.equal(wrongMime.status, 415);

  await new Promise(resolve => server.close(resolve));
  await startServer();
  const alexAfterRestart = await login('alex@ajaia.demo');
  const persisted = await fetch(`${origin}/api/documents/${document.id}`, { headers: { cookie: alexAfterRestart } });
  assert.equal(persisted.status, 200);
  assert.equal((await persisted.json()).document.content, '<p>Saved in the document store.</p>');
  const reshare = await fetch(`${origin}/api/documents/${document.id}/share`, { method: 'PUT', headers: { cookie: alexAfterRestart, 'content-type': 'application/json' }, body: JSON.stringify({ changes: [{ userId: 'user_jamie', role: 'editor' }], removeUserIds: [] }) });
  assert.equal(reshare.status, 200);
  const jamieAfterRestart = await login('jamie@ajaia.demo');
  assert.equal((await fetch(`${origin}/api/documents/${document.id}`, { headers: { cookie: jamieAfterRestart } })).status, 200);
  assert.equal((await fetch(`${origin}/api/documents/${document.id}`, { method: 'DELETE', headers: { cookie: jamieAfterRestart } })).status, 403);
  const deleteOwner = await fetch(`${origin}/api/documents/${document.id}`, { method: 'DELETE', headers: { cookie: alexAfterRestart } });
  assert.equal(deleteOwner.status, 200);
  const deletedRead = await fetch(`${origin}/api/documents/${document.id}`, { headers: { cookie: alexAfterRestart } });
  assert.equal(deletedRead.status, 404);
  const collaboratorDeletedRead = await fetch(`${origin}/api/documents/${document.id}`, { headers: { cookie: jamieAfterRestart } });
  assert.equal(collaboratorDeletedRead.status, 404);
  const jamieList = await fetch(`${origin}/api/documents`, { headers: { cookie: jamieAfterRestart } });
  assert.equal((await jamieList.json()).documents.some(item => item.id === document.id), false);
  const preservedRead = await fetch(`${origin}/api/documents/${unrelatedId}`, { headers: { cookie: alexAfterRestart } });
  assert.equal(preservedRead.status, 200);
});
