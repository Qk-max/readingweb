const loginView = document.querySelector('#login-view');
const adminView = document.querySelector('#admin-view');
const loginForm = document.querySelector('#login-form');
const loginMessage = document.querySelector('#login-message');
const recordForm = document.querySelector('#record-form');
const entryList = document.querySelector('#entry-list');
const deleteButton = document.querySelector('#delete-record');
const entryCount = document.querySelector('#entry-count');
const saveState = document.querySelector('#save-state');
const formMode = document.querySelector('#form-mode');
let records = [];
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
  recordForm.elements.image.value = record.image || '';
  recordForm.elements.tags.value = (record.tags || []).join('，');
  recordForm.elements.note.value = record.note || '';
  recordForm.elements.published.checked = record.published !== false;
  deleteButton.hidden = !record.id;
  formMode.textContent = record.id ? '编辑记录' : '新建记录';
  saveState.textContent = '';
}
function renderList() {
  entryCount.textContent = `${records.length} 则记录`;
  entryList.innerHTML = records.map(record => `<button class="entry ${recordForm.elements.id.value === record.id ? 'is-active' : ''}" data-id="${escapeHTML(record.id)}"><img src="${escapeHTML(record.image)}" alt="" /><span><strong>${escapeHTML(record.title)}</strong><small>${escapeHTML(record.byline)}</small></span><i class="entry-status">${record.published ? '公开' : '草稿'}</i></button>`).join('');
  entryList.querySelectorAll('.entry').forEach(button => button.addEventListener('click', () => { formData(records.find(record => record.id === button.dataset.id)); renderList(); }));
}
async function loadRecords() { records = await api('/api/admin/records'); renderList(); }
async function showAdmin() { loginView.hidden = true; adminView.hidden = false; await loadRecords(); formData(records[0]); renderList(); }
loginForm.addEventListener('submit', async event => { event.preventDefault(); loginMessage.textContent = '正在验证…'; try { await api('/api/auth/login', { method:'POST', body:JSON.stringify({ password:new FormData(loginForm).get('password') }) }); await showAdmin(); } catch (error) { loginMessage.textContent = error.message; } });
document.querySelector('#new-record').addEventListener('click', () => { formData(); renderList(); });
document.querySelector('#logout').addEventListener('click', async () => { await api('/api/auth/logout', { method:'POST' }); adminView.hidden = true; loginView.hidden = false; loginForm.reset(); });
recordForm.addEventListener('submit', async event => { event.preventDefault(); const payload = Object.fromEntries(new FormData(recordForm)); payload.published = recordForm.elements.published.checked; saveState.textContent = '正在保存…'; try { const id = payload.id; const result = await api(id ? `/api/admin/records/${id}` : '/api/admin/records', { method:id ? 'PUT' : 'POST', body:JSON.stringify(payload) }); await loadRecords(); formData(result.record); renderList(); saveState.textContent = result.sync.message; } catch (error) { saveState.textContent = error.message; } });
deleteButton.addEventListener('click', async () => { const id = recordForm.elements.id.value; if (!id || !confirm('确定删除这则记录吗？此操作不可撤销。')) return; try { const result = await api(`/api/admin/records/${id}`, { method:'DELETE' }); await loadRecords(); formData(records[0]); renderList(); saveState.textContent = result.sync.message; } catch (error) { saveState.textContent = error.message; } });
(async () => { try { const session = await api('/api/auth/session'); if (session.authenticated) await showAdmin(); } catch { /* login page remains available */ } })();
