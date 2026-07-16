let records = [];
let activeFilter = 'all';

const grid = document.querySelector('#record-grid');
const search = document.querySelector('#search');
const count = document.querySelector('#result-count');
const empty = document.querySelector('#empty-state');
const dialog = document.querySelector('#record-dialog');
const dialogContent = document.querySelector('#dialog-content');

const escapeHTML = value => String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);
const visibleRecords = () => {
  const query = search.value.trim().toLocaleLowerCase('zh-CN');
  return records.filter(record => {
    const searchable = `${record.title} ${record.byline} ${record.tags.join(' ')}`.toLocaleLowerCase('zh-CN');
    return (activeFilter === 'all' || record.type === activeFilter) && (!query || searchable.includes(query));
  });
};

function updateFilterCounts() {
  document.querySelectorAll('.filter').forEach(button => {
    const filter = button.dataset.filter;
    const value = filter === 'all' ? records.length : records.filter(record => record.type === filter).length;
    button.querySelector('span').textContent = String(value).padStart(2, '0');
  });
}

function render() {
  const filtered = visibleRecords();
  grid.innerHTML = filtered.map(record => `
    <article class="record">
      <button class="cover" type="button" data-open="${escapeHTML(record.id)}" aria-label="查看 ${escapeHTML(record.title)} 的详情">
        <img src="${escapeHTML(record.image)}" alt="${escapeHTML(record.title)} 的氛围配图" loading="lazy" />
        <span class="record-type">${escapeHTML(record.typeLabel)}</span><span class="record-rating">${escapeHTML(record.rating)}</span>
      </button>
      <div class="record-meta"><h3>${escapeHTML(record.title)}</h3><p>${escapeHTML(record.byline)}<span>↗</span></p></div>
    </article>`).join('');
  count.textContent = `${String(filtered.length).padStart(2, '0')} 则记录`;
  empty.hidden = filtered.length !== 0;
  grid.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openRecord(button.dataset.open)));
}

function openRecord(id) {
  const record = records.find(item => item.id === id);
  if (!record) return;
  dialogContent.innerHTML = `<article class="dialog-layout">
    <img src="${escapeHTML(record.image)}" alt="${escapeHTML(record.title)} 的氛围配图" />
    <div class="dialog-copy"><p class="tag">${escapeHTML(record.typeLabel)}记录</p><h2>${escapeHTML(record.title)}</h2>
      <p class="dialog-byline">${escapeHTML(record.byline)} <span class="dialog-score">· ${escapeHTML(record.rating)}</span></p>
      <p class="dialog-note">${escapeHTML(record.note)}</p><div class="dialog-tags">${record.tags.map(tag => `<span># ${escapeHTML(tag)}</span>`).join('')}</div>
    </div></article>`;
  dialog.showModal();
}

async function loadRecords() {
  try {
    const response = await fetch('/api/records');
    if (!response.ok) throw new Error('加载失败');
    records = await response.json();
    updateFilterCounts();
    render();
  } catch {
    grid.innerHTML = '<p class="empty-state">记录暂时无法载入，请稍后再试。</p>';
  }
}

document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll('.filter').forEach(item => item.classList.toggle('is-active', item === button));
  render();
}));
search.addEventListener('input', render);
document.querySelector('.solid-link').addEventListener('click', () => openRecord('perfect-days'));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
loadRecords();
