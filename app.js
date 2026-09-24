const statusEl = document.getElementById('status');
const submitBtn = document.getElementById('submit-btn');
const form = document.getElementById('record-form');
const measuredDateInput = document.getElementById('measuredDate');
const measuredTimeInput = document.getElementById('measuredTime');

const charts = {};
let records = [];

function setDefaultDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const iso = now.toISOString();
  measuredDateInput.value = iso.slice(0, 10);
  measuredTimeInput.value = iso.slice(11, 16);
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
    .map(r => ({
      timestamp: r.timestamp,
      height: Number(r.height),
      weight: Number(r.weight),
      bodyFat: Number(r.bodyFat),
      muscleMass: Number(r.muscleMass),
      visceralFat: Number(r.visceralFat)
    }))
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

function formatDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
}

function renderStats() {
  const statsEl = document.getElementById('stats');
  statsEl.innerHTML = '';
  if (records.length === 0) return;
  const latest = records[records.length - 1];
  const items = [
    { label: '身長', value: `${latest.height} cm` },
    { label: '体重', value: `${latest.weight} kg` },
    { label: '体脂肪率', value: `${latest.bodyFat} %` },
    { label: '骨格筋肉量', value: `${latest.muscleMass} kg` },
    { label: '内臓脂肪レベル', value: `${latest.visceralFat}` }
  ];
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'stat';
    div.innerHTML = `<div class="label">${item.label}</div><div class="value">${item.value}</div>`;
    statsEl.appendChild(div);
  });
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

  [...records].reverse().forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDateTime(r.timestamp)}</td>
      <td>${r.weight}</td>
      <td>${r.bodyFat}</td>
      <td>${r.muscleMass}</td>
      <td>${r.visceralFat}</td>
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

function buildChart(canvasId, label, color, dataKey) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label,
        data: [],
        borderColor: color,
        backgroundColor: color,
        tension: 0.3,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: false } }
    }
  });
}

function renderCharts() {
  const labels = records.map(r => formatDateShort(r.timestamp));
  const setData = (chart, key) => {
    chart.data.labels = labels;
    chart.data.datasets[0].data = records.map(r => r[key]);
    chart.update();
  };
  setData(charts.weight, 'weight');
  setData(charts.bodyFat, 'bodyFat');
  setData(charts.muscleMass, 'muscleMass');
  setData(charts.visceralFat, 'visceralFat');
}

async function reload() {
  setStatus('読み込み中...');
  records = await fetchRecords();
  renderStats();
  renderTable();
  renderCharts();
  setStatus('');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  setStatus('保存中...');
  try {
    const record = {
      timestamp: new Date(`${measuredDateInput.value}T${measuredTimeInput.value}`).toISOString(),
      height: HEIGHT_CM,
      weight: document.getElementById('weight').value,
      bodyFat: document.getElementById('bodyFat').value,
      muscleMass: document.getElementById('muscleMass').value,
      visceralFat: document.getElementById('visceralFat').value
    };
    await createRecord(record);
    form.reset();
    setDefaultDateTime();
    await reload();
    setStatus('記録しました');
  } catch (err) {
    setStatus('保存に失敗しました: ' + err.message, true);
  } finally {
    submitBtn.disabled = false;
  }
});

(function init() {
  setDefaultDateTime();
  charts.weight = buildChart('weightChart', '体重 (kg)', '#3b82f6');
  charts.bodyFat = buildChart('bodyFatChart', '体脂肪率 (%)', '#f59e0b');
  charts.muscleMass = buildChart('muscleMassChart', '骨格筋肉量 (kg)', '#10b981');
  charts.visceralFat = buildChart('visceralFatChart', '内臓脂肪レベル', '#ef4444');

  if (!GAS_URL || GAS_URL === 'YOUR_GAS_WEB_APP_URL_HERE') {
    setStatus('config.js に GAS_URL を設定してください', true);
    return;
  }
  reload().catch(err => setStatus('読み込みに失敗しました: ' + err.message, true));
})();
