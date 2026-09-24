const statusEl = document.getElementById('status');
const submitBtn = document.getElementById('submit-btn');
const form = document.getElementById('record-form');
const measuredDateInput = document.getElementById('measuredDate');
const measuredTimeInput = document.getElementById('measuredTime');
const modalBackdrop = document.getElementById('modal-backdrop');
const addBtn = document.getElementById('add-btn');
const modalCloseBtn = document.getElementById('modal-close');
const toggleDatetimeBtn = document.getElementById('toggle-datetime');
const datetimeFields = document.getElementById('datetime-fields');

const METRICS = {
  weight: { label: '体重', unit: 'kg', color: '#3b82f6' },
  bodyFat: { label: '体脂肪率', unit: '%', color: '#f59e0b' },
  muscleMass: { label: '骨格筋肉量', unit: 'kg', color: '#10b981' },
  visceralFat: { label: '内臓脂肪レベル', unit: '', color: '#ef4444' },
  bmi: { label: 'BMI', unit: '', color: '#8b5cf6' }
};

let records = [];
let currentMetric = 'weight';
let mainChart = null;

const CACHE_KEY = 'wt_records_cache_v1';

function loadCachedRecords() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveCachedRecords(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    // ignore (private browsing, storage full, etc.)
  }
}

function computeBmi(weight) {
  const heightM = HEIGHT_CM / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

function setStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? 'var(--danger)' : 'var(--muted)';
}

async function fetchRecords() {
  const res = await fetch(GAS_URL);
  if (!res.ok) throw new Error('取得に失敗しました');
  const data = await res.json();
  return data
    .map(r => {
      const weight = Number(r.weight);
      return {
        timestamp: r.timestamp,
        height: Number(r.height),
        weight,
        bodyFat: Number(r.bodyFat),
        muscleMass: Number(r.muscleMass),
        visceralFat: Number(r.visceralFat),
        bmi: computeBmi(weight)
      };
    })
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

async function createRecord(record) {
  await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(record)
  });
}

async function deleteRecord(timestamp) {
  await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'delete', timestamp })
  });
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
}

function formatDelta(delta, digits) {
  if (delta === null) return null;
  const rounded = Math.round(delta * Math.pow(10, digits)) / Math.pow(10, digits);
  if (rounded === 0) return { text: '前回と同じ', cls: '' };
  const sign = rounded > 0 ? '+' : '';
  return {
    text: `前回より ${sign}${rounded}`,
    cls: rounded > 0 ? 'up' : 'down'
  };
}

// ---------- Home dashboard ----------

function renderHome() {
  const heroCard = document.getElementById('hero-card');
  const statsGrid = document.getElementById('stats-grid');
  const homeEmpty = document.getElementById('home-empty');
  const allRecordsCard = document.getElementById('all-records-card');
  heroCard.innerHTML = '';
  statsGrid.innerHTML = '';

  if (records.length === 0) {
    heroCard.style.display = 'none';
    statsGrid.style.display = 'none';
    allRecordsCard.style.display = 'none';
    homeEmpty.hidden = false;
    return;
  }
  heroCard.style.display = '';
  statsGrid.style.display = '';
  allRecordsCard.style.display = '';
  homeEmpty.hidden = true;

  const latest = records[records.length - 1];
  const prev = records.length > 1 ? records[records.length - 2] : null;

  const weightDelta = prev ? formatDelta(latest.weight - prev.weight, 1) : null;
  heroCard.innerHTML = `
    <div class="hero-date">${formatDate(latest.timestamp)}</div>
    <div class="hero-weight-row">
      <div class="hero-weight">${latest.weight}</div>
      <div class="hero-unit">kg</div>
    </div>
    ${weightDelta ? `<div class="hero-delta ${weightDelta.cls}">${weightDelta.text}kg</div>` : ''}
  `;

  const cards = [
    { key: 'bodyFat', label: '体脂肪率', unit: '%', digits: 1 },
    { key: 'muscleMass', label: '骨格筋肉量', unit: 'kg', digits: 1 },
    { key: 'bmi', label: 'BMI', unit: '', digits: 1 },
    { key: 'visceralFat', label: '内臓脂肪レベル', unit: '', digits: 1 }
  ];

  cards.forEach(c => {
    const delta = prev ? formatDelta(latest[c.key] - prev[c.key], c.digits) : null;
    const div = document.createElement('div');
    div.className = 'stat-card';
    div.innerHTML = `
      <div class="label">${c.label}</div>
      <div class="value">${latest[c.key]}${c.unit}</div>
      <div class="delta ${delta ? delta.cls : ''}">${delta ? delta.text : ''}</div>
    `;
    statsGrid.appendChild(div);
  });

  renderAllRecordsTable();
}

function renderAllRecordsTable() {
  const body = document.getElementById('all-records-body');
  body.innerHTML = '';

  [...records].reverse().forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDateTime(r.timestamp)}</td>
      <td>${r.weight}kg</td>
      <td>${r.bodyFat}%</td>
      <td>${r.muscleMass}kg</td>
      <td>${r.visceralFat}</td>
      <td>${r.bmi}</td>
      <td><button class="delete-btn" data-timestamp="${r.timestamp}">削除</button></td>
    `;
    body.appendChild(tr);
  });

  body.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('この記録を削除しますか？')) return;
      btn.disabled = true;
      try {
        await deleteRecord(btn.dataset.timestamp);
        await reload();
      } catch (err) {
        setStatus('削除に失敗しました: ' + err.message, true);
      }
    });
  });
}

// ---------- Graph view ----------

function buildChart() {
  const ctx = document.getElementById('mainChart').getContext('2d');
  mainChart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [{ data: [], borderColor: '#3b82f6', backgroundColor: '#3b82f6', tension: 0.3, pointRadius: 3 }] },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: false } }
    }
  });
}

function renderGraph() {
  const metric = METRICS[currentMetric];
  document.getElementById('records-th-value').textContent = metric.label;

  const currentEl = document.getElementById('graph-current');
  if (records.length === 0) {
    currentEl.innerHTML = '';
  } else {
    const latest = records[records.length - 1];
    currentEl.innerHTML = `
      <div class="value">${latest[currentMetric]}${metric.unit}</div>
      <div class="label">${metric.label}（${formatDate(latest.timestamp)}）</div>
    `;
  }

  mainChart.data.labels = records.map(r => formatDateShort(r.timestamp));
  mainChart.data.datasets[0].data = records.map(r => r[currentMetric]);
  mainChart.data.datasets[0].borderColor = metric.color;
  mainChart.data.datasets[0].backgroundColor = metric.color;
  mainChart.update();

  renderTable();
}

function renderTable() {
  const body = document.getElementById('records-body');
  const emptyMessage = document.getElementById('empty-message');
  body.innerHTML = '';

  if (records.length === 0) {
    emptyMessage.style.display = 'block';
    return;
  }
  emptyMessage.style.display = 'none';

  const metric = METRICS[currentMetric];
  [...records].reverse().forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDateTime(r.timestamp)}</td>
      <td>${r[currentMetric]}${metric.unit}</td>
      <td><button class="delete-btn" data-timestamp="${r.timestamp}">削除</button></td>
    `;
    body.appendChild(tr);
  });

  body.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('この記録を削除しますか？')) return;
      btn.disabled = true;
      try {
        await deleteRecord(btn.dataset.timestamp);
        await reload();
      } catch (err) {
        setStatus('削除に失敗しました: ' + err.message, true);
      }
    });
  });
}

// ---------- Tabs ----------

document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
  const tab = btn.dataset.tab;
  document.getElementById('home-view').hidden = tab !== 'home';
  document.getElementById('graph-view').hidden = tab !== 'graph';
});

document.getElementById('metric-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.metric-btn');
  if (!btn) return;
  document.querySelectorAll('.metric-btn').forEach(b => b.classList.toggle('active', b === btn));
  currentMetric = btn.dataset.metric;
  renderGraph();
});

// ---------- Modal ----------

function openModal() {
  form.reset();
  datetimeFields.hidden = true;
  modalBackdrop.hidden = false;
}

function closeModal() {
  modalBackdrop.hidden = true;
}

addBtn.addEventListener('click', openModal);
modalCloseBtn.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) closeModal();
});

toggleDatetimeBtn.addEventListener('click', () => {
  datetimeFields.hidden = !datetimeFields.hidden;
  if (!datetimeFields.hidden) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const iso = now.toISOString();
    measuredDateInput.value = iso.slice(0, 10);
    measuredTimeInput.value = iso.slice(11, 16);
  }
});

// ---------- Load / submit ----------

async function reload() {
  const slowNoticeTimer = setTimeout(() => {
    setStatus('起動に時間がかかっています。初回アクセス時は30秒ほどかかることがあります…');
  }, 5000);
  try {
    setStatus('読み込み中...');
    records = await fetchRecords();
    saveCachedRecords(records);
    renderHome();
    renderGraph();
    setStatus('');
  } finally {
    clearTimeout(slowNoticeTimer);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  setStatus('保存中...');
  try {
    const timestamp = !datetimeFields.hidden && measuredDateInput.value && measuredTimeInput.value
      ? new Date(`${measuredDateInput.value}T${measuredTimeInput.value}`).toISOString()
      : new Date().toISOString();

    const record = {
      timestamp,
      height: HEIGHT_CM,
      weight: document.getElementById('weight').value,
      bodyFat: document.getElementById('bodyFat').value,
      muscleMass: document.getElementById('muscleMass').value,
      visceralFat: document.getElementById('visceralFat').value
    };
    await createRecord(record);
    closeModal();
    await reload();
    setStatus('記録しました');
  } catch (err) {
    setStatus('保存に失敗しました: ' + err.message, true);
  } finally {
    submitBtn.disabled = false;
  }
});

(function init() {
  buildChart();

  if (!GAS_URL || GAS_URL === 'YOUR_GAS_WEB_APP_URL_HERE') {
    setStatus('config.js に GAS_URL を設定してください', true);
    return;
  }

  const cached = loadCachedRecords();
  if (cached && cached.length > 0) {
    records = cached;
    renderHome();
    renderGraph();
    setStatus('前回の記録を表示中…最新データを読み込んでいます');
  }

  reload().catch(err => setStatus('読み込みに失敗しました: ' + err.message, true));
})();
