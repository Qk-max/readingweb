let records = [];
let collections = [];
let activeFilter = 'all';
let activeRoute = 'home';

const grid = document.querySelector('#record-grid');
const empty = document.querySelector('#empty-state');
const dialog = document.querySelector('#record-dialog');
const dialogContent = document.querySelector('#dialog-content');
const main = document.querySelector('main');
const routeCount = document.querySelector('#route-count');
const archiveIndex = document.querySelector('#archive-index');
const archiveTitle = document.querySelector('#archive-title');
const archiveDescription = document.querySelector('#archive-description');
const searchInput = document.querySelector('#record-search');
const timeline = document.querySelector('#timeline');
const timelineEmpty = document.querySelector('#timeline-empty');
const collectionGrid = document.querySelector('#collection-grid');
const collectionEmpty = document.querySelector('#collection-empty');

const routes = {
  home: { page: 'home', filter: 'all' },
  archive: { page: 'archive', filter: 'all', number: '00', index: '00 / 全部档案', title: '收藏一些故事，<br /><em>留下几片树叶。</em>', description: '按下封面，展开一则记录。' },
  films: { page: 'archive', filter: 'film', number: '01', index: '01 / 光影漫游', title: '在银幕的光里，<br /><em>看见更多森林。</em>', description: '电影记录、重看笔记与散场后的余温。' },
  books: { page: 'archive', filter: 'book', number: '02', index: '02 / 阅读小径', title: '打开一本书，<br /><em>走进另一片森林。</em>', description: '读过的书、划线的句子与缓慢生长的感受。' },
  essays: { page: 'archive', filter: 'essay', number: '03', index: '03 / 森林便签', title: '把日常的片刻，<br /><em>夹进一页树叶里。</em>', description: '城市散步、阅读片段和没有标题的心情。' },
  yearbook: { page: 'yearbook', filter: 'all' },
  collections: { page: 'collections', filter: 'all' }
};

const escapeHTML = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

function currentRecords() {
  const query = searchInput.value.trim().toLocaleLowerCase('zh-CN');
  return records.filter(record => {
    const searchable = `${record.title} ${record.byline} ${record.tags.join(' ')} ${record.note}`.toLocaleLowerCase('zh-CN');
    return (activeFilter === 'all' || record.type === activeFilter) && (!query || searchable.includes(query));
  });
}

function recordTime(record) {
  const timestamp = Date.parse(record.completedAt || record.updatedAt || '');
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatDate(record, options = { month:'long', day:'numeric' }) {
  const date = new Date(record.completedAt || record.updatedAt || '');
  return Number.isNaN(date.getTime()) ? '未标日期' : date.toLocaleDateString('zh-CN', options);
}

function bindOpenButtons(scope = document) {
  scope.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openRecord(button.dataset.open)));
}

function updateArchiveHeader() {
  const route = routes[activeRoute] || routes.archive;
  if (!route.index) return;
  archiveIndex.textContent = route.index;
  archiveTitle.innerHTML = route.title;
  archiveDescription.textContent = route.description;
  routeCount.textContent = route.number;
}

function render() {
  const filtered = currentRecords();
  grid.innerHTML = filtered.map(record => `
    <article class="record">
      <button class="cover" type="button" data-open="${escapeHTML(record.id)}" aria-label="查看 ${escapeHTML(record.title)} 的详情">
        <img src="${escapeHTML(record.image)}" alt="${escapeHTML(record.title)} 的氛围配图" loading="lazy" />
        <span class="record-type">${escapeHTML(record.typeLabel)}</span><span class="record-rating">${escapeHTML(record.rating)}</span>
      </button>
      <div class="record-meta"><h3>${escapeHTML(record.title)}</h3><p>${escapeHTML(record.byline)}<span>↗</span></p></div>
    </article>`).join('');
  empty.hidden = filtered.length !== 0;
  bindOpenButtons(grid);
  updateArchiveHeader();
}

function renderTimeline() {
  const datedRecords = [...records].sort((a, b) => recordTime(b) - recordTime(a));
  const grouped = datedRecords.reduce((years, record) => {
    const year = new Date(recordTime(record) || Date.now()).getFullYear();
    (years[year] ||= []).push(record);
    return years;
  }, {});
  timeline.innerHTML = Object.entries(grouped).sort(([a], [b]) => Number(b) - Number(a)).map(([year, entries]) => `
    <section class="timeline-year"><p class="timeline-year-label">${year}</p><div class="timeline-list">${entries.map(record => `
      <article class="timeline-entry"><p class="timeline-date">${escapeHTML(formatDate(record))}</p><button type="button" class="timeline-record" data-open="${escapeHTML(record.id)}"><img src="${escapeHTML(record.image)}" alt="" loading="lazy" /><span><i>${escapeHTML(record.typeLabel)}</i><strong>${escapeHTML(record.title)}</strong><small>${escapeHTML(record.byline)}</small></span><b>${escapeHTML(record.rating)}</b></button></article>`).join('')}</div></section>`).join('');
  timelineEmpty.hidden = datedRecords.length !== 0;
  bindOpenButtons(timeline);
}

function renderCollections() {
  const populatedCollections = collections.map(collection => ({ ...collection, records:(collection.recordIds || []).map(id => records.find(record => record.id === id)).filter(Boolean) })).filter(collection => collection.records.length);
  collectionGrid.innerHTML = populatedCollections.map(collection => `
    <article class="collection-card"><div class="collection-card-top"><p class="small-title">${String(collection.records.length).padStart(2, '0')} / 专题记录</p><span>✳</span></div><h3>${escapeHTML(collection.title)}</h3><p>${escapeHTML(collection.description)}</p><div class="collection-covers">${collection.records.slice(0, 3).map(record => `<button type="button" data-open="${escapeHTML(record.id)}"><img src="${escapeHTML(record.image)}" alt="${escapeHTML(record.title)}" loading="lazy" /></button>`).join('')}</div><small>${collection.records.map(record => escapeHTML(record.title)).join(' · ')}</small></article>`).join('');
  collectionEmpty.hidden = populatedCollections.length !== 0;
  bindOpenButtons(collectionGrid);
}

function openRecord(id) {
  const record = records.find(item => item.id === id);
  if (!record) return;
  dialogContent.innerHTML = `<article class="dialog-layout">
    <img src="${escapeHTML(record.image)}" alt="${escapeHTML(record.title)} 的氛围配图" />
    <div class="dialog-copy"><p class="tag">${escapeHTML(record.typeLabel)}记录</p><h2>${escapeHTML(record.title)}</h2>
      <p class="dialog-byline">${escapeHTML(record.byline)} <span class="dialog-score">· ${escapeHTML(record.rating)}</span></p>
      <p class="dialog-date">完成于 ${escapeHTML(formatDate(record, { year:'numeric', month:'long', day:'numeric' }))}</p><p class="dialog-note">${escapeHTML(record.note)}</p><div class="dialog-tags">${(record.tags || []).map(tag => `<span># ${escapeHTML(tag)}</span>`).join('')}${record.collection ? `<span>⌁ ${escapeHTML(record.collection)}</span>` : ''}</div>
    </div></article>`;
  dialog.showModal();
}

function applyRoute(routeName, shouldScroll = true) {
  const route = routes[routeName] || routes.home;
  activeRoute = routes[routeName] ? routeName : 'home';
  activeFilter = route.filter;
  main.dataset.route = activeRoute;
  document.querySelectorAll('[data-page]').forEach(view => view.classList.toggle('is-active', view.dataset.page === route.page));
  document.querySelectorAll('[data-route]').forEach(link => link.classList.toggle('is-active', link.dataset.route === activeRoute));
  render();
  renderTimeline();
  renderCollections();
  if (shouldScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function routeFromHash() {
  const name = window.location.hash.slice(1);
  return routes[name] ? name : 'home';
}

async function loadRecords() {
  try {
    const [recordResponse, collectionResponse] = await Promise.all([fetch('/api/records'), fetch('/api/collections')]);
    if (!recordResponse.ok || !collectionResponse.ok) throw new Error('加载失败');
    [records, collections] = await Promise.all([recordResponse.json(), collectionResponse.json()]);
    render();
    renderTimeline();
    renderCollections();
  } catch {
    grid.innerHTML = '<p class="empty-state">记录暂时无法载入，请稍后再试。</p>';
  }
}

document.querySelectorAll('[data-route]').forEach(link => link.addEventListener('click', event => {
  const route = link.dataset.route;
  if (!routes[route]) return;
  event.preventDefault();
  if (window.location.hash === `#${route}`) applyRoute(route);
  else window.location.hash = route;
}));

searchInput.addEventListener('input', render);

document.querySelector('.solid-link').addEventListener('click', () => openRecord('perfect-days'));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
window.addEventListener('hashchange', () => applyRoute(routeFromHash()));

applyRoute(routeFromHash(), false);
loadRecords();
