const loginView = document.querySelector('#login-view');
const adminView = document.querySelector('#admin-view');
const loginForm = document.querySelector('#login-form');
const loginMessage = document.querySelector('#login-message');
const recordManager = document.querySelector('#record-manager');
const collectionManager = document.querySelector('#collection-manager');
const recordForm = document.querySelector('#record-form');
const collectionForm = document.querySelector('#collection-form');
const entryList = document.querySelector('#entry-list');
const collectionList = document.querySelector('#collection-list');
const collectionRecords = document.querySelector('#collection-records');
const deleteButton = document.querySelector('#delete-record');
const deleteCollectionButton = document.querySelector('#delete-collection');
const entryCount = document.querySelector('#entry-count');
const collectionCount = document.querySelector('#collection-count');
const saveState = document.querySelector('#save-state');
const collectionSaveState = document.querySelector('#collection-save-state');
const formMode = document.querySelector('#form-mode');
const collectionFormMode = document.querySelector('#collection-form-mode');
let records = [];
let collections = [];
const escapeHTML = value => String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);

async function api(url, options = {}) {
  const response = await fetch(url, { headers:{ 'Content-Type':'application/json', ...(options.headers || {}) }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || '请求失败。');
  return body;
}

function formData(record = {}) {
  recordForm.elements.id.value = record.id || '';
  recordForm.elements.type.value = record.type || 'film';
  recordForm.elements.rating.value = record.rating || '';
  recordForm.elements.title.value = record.title || '';
  recordForm.elements.byline.value = record.byline || '';
  recordForm.elements.completedAt.value = (record.completedAt || '').slice(0, 10);
  recordForm.elements.collection.value = record.collection || '';
  recordForm.elements.image.value = record.image || '';
  recordForm.elements.tags.value = (record.tags || []).join('，');
  recordForm.elements.note.value = record.note || '';
  recordForm.elements.published.checked = record.published !== false;
  deleteButton.hidden = !record.id;
  formMode.textContent = record.id ? '编辑记录 / 森林年轮' : '新建记录 / 森林年轮';
  saveState.textContent = '';
}

function renderList() {
  entryCount.textContent = `${records.length} 则记录`;
  entryList.innerHTML = records.map(record => `<button class="entry ${recordForm.elements.id.value === record.id ? 'is-active' : ''}" data-id="${escapeHTML(record.id)}"><img src="${escapeHTML(record.image)}" alt="" /><span><strong>${escapeHTML(record.title)}</strong><small>${escapeHTML(record.byline)} · ${escapeHTML(record.completedAt || '未标完成日期')}</small></span><i class="entry-status">${record.published ? '公开' : '草稿'}</i></button>`).join('');
  entryList.querySelectorAll('.entry').forEach(button => button.addEventListener('click', () => { formData(records.find(record => record.id === button.dataset.id)); renderList(); }));
}

function renderCollectionPicker(selectedIds = []) {
  collectionRecords.innerHTML = records.map(record => `<label class="collection-record-option"><input type="checkbox" name="recordIds" value="${escapeHTML(record.id)}" ${selectedIds.includes(record.id) ? 'checked' : ''} /><img src="${escapeHTML(record.image)}" alt="" /><span><strong>${escapeHTML(record.title)}</strong><small>${escapeHTML(record.byline)}</small></span><i>${escapeHTML(record.typeLabel)}</i></label>`).join('');
}

function collectionData(collection = {}) {
  collectionForm.elements.id.value = collection.id || '';
  collectionForm.elements.title.value = collection.title || '';
  collectionForm.elements.description.value = collection.description || '';
  renderCollectionPicker(collection.recordIds || []);
  deleteCollectionButton.hidden = !collection.id;
  collectionFormMode.textContent = collection.id ? '编辑专题书单 / 片单' : '新建专题书单 / 片单';
  collectionSaveState.textContent = '';
}

function renderCollectionList() {
  collectionCount.textContent = `${collections.length} 个专题`;
  collectionList.innerHTML = collections.map(collection => {
    const firstRecord = records.find(record => (collection.recordIds || []).includes(record.id));
    const cover = firstRecord ? `<img src="${escapeHTML(firstRecord.image)}" alt="" />` : '<span class="collection-placeholder">✳</span>';
    return `<button class="entry ${collectionForm.elements.id.value === collection.id ? 'is-active' : ''}" data-collection-id="${escapeHTML(collection.id)}">${cover}<span><strong>${escapeHTML(collection.title)}</strong><small>${(collection.recordIds || []).length} 则收录 · ${escapeHTML(collection.description)}</small></span><i class="entry-status">专题</i></button>`;
  }).join('');
  collectionList.querySelectorAll('[data-collection-id]').forEach(button => button.addEventListener('click', () => { collectionData(collections.find(collection => collection.id === button.dataset.collectionId)); renderCollectionList(); }));
}

async function loadRecords() { records = await api('/api/admin/records'); renderList(); renderCollectionPicker(collectionForm.elements.id.value ? Array.from(collectionForm.querySelectorAll('input[name="recordIds"]:checked')).map(input => input.value) : []); }
async function loadCollections() { collections = await api('/api/admin/collections'); renderCollectionList(); }

function showManager(name) {
  const isRecords = name === 'records';
  recordManager.hidden = !isRecords;
  collectionManager.hidden = isRecords;
  document.querySelector('#new-record').hidden = !isRecords;
  document.querySelector('#show-records').classList.toggle('is-active', isRecords);
  document.querySelector('#show-collections').classList.toggle('is-active', !isRecords);
}

async function showAdmin() {
  loginView.hidden = true;
  adminView.hidden = false;
  await Promise.all([loadRecords(), loadCollections()]);
  formData(records[0]);
  collectionData(collections[0]);
  renderList();
  renderCollectionList();
  showManager('records');
}

loginForm.addEventListener('submit', async event => { event.preventDefault(); loginMessage.textContent = '正在验证…'; try { await api('/api/auth/login', { method:'POST', body:JSON.stringify({ password:new FormData(loginForm).get('password') }) }); await showAdmin(); } catch (error) { loginMessage.textContent = error.message; } });
document.querySelector('#show-records').addEventListener('click', () => showManager('records'));
document.querySelector('#show-collections').addEventListener('click', () => showManager('collections'));
document.querySelector('#new-record').addEventListener('click', () => { formData(); renderList(); });
document.querySelector('#new-collection').addEventListener('click', () => { collectionData(); renderCollectionList(); });
document.querySelector('#logout').addEventListener('click', async () => { await api('/api/auth/logout', { method:'POST' }); adminView.hidden = true; loginView.hidden = false; loginForm.reset(); });

recordForm.addEventListener('submit', async event => { event.preventDefault(); const payload = Object.fromEntries(new FormData(recordForm)); payload.published = recordForm.elements.published.checked; saveState.textContent = '正在保存…'; try { const id = payload.id; const result = await api(id ? `/api/admin/records/${id}` : '/api/admin/records', { method:id ? 'PUT' : 'POST', body:JSON.stringify(payload) }); await loadRecords(); formData(result.record); renderList(); collectionData(collections.find(collection => collection.id === collectionForm.elements.id.value) || {}); saveState.textContent = result.sync.message; } catch (error) { saveState.textContent = error.message; } });
deleteButton.addEventListener('click', async () => { const id = recordForm.elements.id.value; if (!id || !confirm('确定删除这则记录吗？此操作不可撤销。')) return; try { const result = await api(`/api/admin/records/${id}`, { method:'DELETE' }); await loadRecords(); formData(records[0]); renderList(); saveState.textContent = result.sync.message; } catch (error) { saveState.textContent = error.message; } });

collectionForm.addEventListener('submit', async event => { event.preventDefault(); const data = new FormData(collectionForm); const payload = { id:data.get('id'), title:data.get('title'), description:data.get('description'), recordIds:data.getAll('recordIds') }; collectionSaveState.textContent = '正在保存…'; try { const result = await api(payload.id ? `/api/admin/collections/${payload.id}` : '/api/admin/collections', { method:payload.id ? 'PUT' : 'POST', body:JSON.stringify(payload) }); await loadCollections(); collectionData(result.collection); renderCollectionList(); collectionSaveState.textContent = result.message; } catch (error) { collectionSaveState.textContent = error.message; } });
deleteCollectionButton.addEventListener('click', async () => { const id = collectionForm.elements.id.value; if (!id || !confirm('确定删除这个专题吗？其中的内容记录不会被删除。')) return; try { const result = await api(`/api/admin/collections/${id}`, { method:'DELETE' }); await loadCollections(); collectionData(collections[0]); renderCollectionList(); collectionSaveState.textContent = result.message; } catch (error) { collectionSaveState.textContent = error.message; } });
(async () => { try { const session = await api('/api/auth/session'); if (session.authenticated) await showAdmin(); } catch { /* login page remains available */ } })();
