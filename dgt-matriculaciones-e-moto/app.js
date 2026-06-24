'use strict';

const E_DATA_BASE = '../microdatos-etl/e-data';

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

const POWER_BANDS  = ['Hasta 11 kW', '11-35 kW', 'Más de 35 kW'];
const POWER_COLORS = ['#4ade80', '#22c55e', '#15803d'];

const BRAND_PALETTE = [
  '#22c55e','#4ade80','#86efac','#16a34a','#15803d',
  '#84cc16','#a3e635','#bef264','#65a30d','#4d7c0f',
  '#06b6d4','#22d3ee','#67e8f9','#0891b2','#0e7490',
];

let brandPieChart       = null;
let carnetChart         = null;
let powerEvolutionChart = null;
let brandEvolutionChart = null;
let evolutionLoaded     = false;

let allModeloRows  = [];
let paginatedRows  = [];
let currentPage    = 1;
const PAGE_SIZE    = 25;

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCsv(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { vals.push(cur); cur = ''; continue; }
      cur += ch;
    }
    vals.push(cur);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
    return obj;
  });
}

async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return parseCsv(await res.text());
}

function formatKw(kw) {
  const n = parseFloat(kw);
  if (!kw || isNaN(n) || n <= 0) return '—';
  return Number.isInteger(n) ? `${n} kW` : `${n.toFixed(1)} kW`;
}

// ── Selectors ─────────────────────────────────────────────────────────────────

function populateSelectors() {
  const now = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const selYear  = document.getElementById('sel-year');
  const selMonth = document.getElementById('sel-month');

  for (let y = 2025; y <= currentYear; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    selYear.appendChild(opt);
  }

  // "Todos" first, then months
  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = 'Todos';
  selMonth.appendChild(allOpt);

  MONTHS.forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = String(i + 1).padStart(2, '0');
    opt.textContent = name;
    selMonth.appendChild(opt);
  });

  selYear.value  = currentYear;
  selMonth.value = String(currentMonth).padStart(2, '0');

  selYear.addEventListener('change', updateMonthOptions);
  selMonth.addEventListener('change', () => loadData(selYear.value, selMonth.value));

  updateMonthOptions();
}

function updateMonthOptions() {
  const selYear  = document.getElementById('sel-year');
  const selMonth = document.getElementById('sel-month');
  const now = new Date();
  const selectedYear = parseInt(selYear.value, 10);
  const maxMonth = selectedYear === now.getFullYear() ? now.getMonth() + 1 : 12;

  Array.from(selMonth.options).forEach(opt => {
    if (opt.value === 'all') { opt.disabled = false; return; }
    const m = parseInt(opt.value, 10);
    opt.disabled = m > maxMonth;
  });

  const curMonth = parseInt(selMonth.value, 10);
  if (!isNaN(curMonth) && curMonth > maxMonth) {
    selMonth.value = String(maxMonth).padStart(2, '0');
  }

  loadData(selYear.value, selMonth.value);
}

// ── Filters ───────────────────────────────────────────────────────────────────

function carnetRange(carnet) {
  if (carnet === 'A1') return [0, 11];
  if (carnet === 'A2') return [11, 35];
  if (carnet === 'A')  return [35, Infinity];
  return null;
}

function derivePotenciaCounts(rows) {
  const counts = { 'Hasta 11 kW': 0, '11-35 kW': 0, 'Más de 35 kW': 0 };
  for (const r of rows) {
    const n = parseFloat(r.KW_ITV);
    const c = parseInt(r.COUNT, 10);
    if (isNaN(n) || n <= 0) continue;
    if (n <= 11)      counts['Hasta 11 kW'] += c;
    else if (n <= 35) counts['11-35 kW']    += c;
    else              counts['Más de 35 kW'] += c;
  }
  return POWER_BANDS.map(b => ({ RANGO_POTENCIA: b, COUNT: String(counts[b]) }));
}

function populateBrandFilter(rows) {
  const sel  = document.getElementById('sel-brand');
  const prev = sel.value;
  sel.innerHTML = '<option value="">Todas las marcas</option>';
  const brands = [...new Set(rows.map(r => r.MARCA_ITV).filter(Boolean))].sort();
  for (const b of brands) {
    const opt = document.createElement('option');
    opt.value = b; opt.textContent = b;
    sel.appendChild(opt);
  }
  if (brands.includes(prev)) sel.value = prev;
}

function applyFilters() {
  const brand  = document.getElementById('sel-brand').value;
  const carnet = document.getElementById('sel-carnet').value;
  const range  = carnetRange(carnet);

  let rows = allModeloRows;

  if (brand) rows = rows.filter(r => r.MARCA_ITV === brand);

  if (range) rows = rows.filter(r => {
    const n = parseFloat(r.KW_ITV);
    if (isNaN(n) || n <= 0) return false;
    return n > range[0] && n <= range[1];
  });

  renderModeloTable(rows);
  renderBrandPieChart(rows);
  renderCarnetChart(derivePotenciaCounts(rows));
}

function wireFilters() {
  ['sel-brand', 'sel-carnet'].forEach(id =>
    document.getElementById(id).addEventListener('change', applyFilters)
  );
  document.getElementById('btn-reset').addEventListener('click', () => {
    document.getElementById('sel-brand').value  = '';
    document.getElementById('sel-carnet').value = '';
    applyFilters();
  });
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadData(year, month) {
  const isAll     = month === 'all';
  const modeloUrl = isAll
    ? `${E_DATA_BASE}/${year}/acumulado-modelo-anual.csv`
    : `${E_DATA_BASE}/${year}/${month}/acumulado-modelo-mensual.csv`;

  try {
    allModeloRows = await fetchCsv(modeloUrl);
  } catch {
    allModeloRows = [];
  }

  populateBrandFilter(allModeloRows);
  applyFilters();
}

// ── Table render ──────────────────────────────────────────────────────────────

function renderModeloTable(rows) {
  const sorted = [...rows].sort((a, b) => parseInt(b.COUNT, 10) - parseInt(a.COUNT, 10));
  paginatedRows = sorted;
  currentPage   = 1;
  renderPage();

  const total = sorted.reduce((s, r) => s + parseInt(r.COUNT, 10), 0);
  document.getElementById('table-summary').textContent = sorted.length
    ? `${sorted.length} modelos · ${total.toLocaleString('es-ES')} unidades totales`
    : '';
  updateChartTotal(total);
}

function renderPage() {
  const tbody      = document.getElementById('table-body');
  const btnPrev    = document.getElementById('btn-prev');
  const btnNext    = document.getElementById('btn-next');
  const pageDisplay = document.getElementById('page-display');
  const paginationInfo = document.getElementById('pagination-info');

  if (!paginatedRows.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Sin datos para el período seleccionado</td></tr>';
    btnPrev.disabled = btnNext.disabled = true;
    pageDisplay.textContent = '';
    paginationInfo.textContent = '';
    updateChartTotal(0);
    return;
  }

  const totalPages = Math.ceil(paginatedRows.length / PAGE_SIZE);
  currentPage = Math.max(1, Math.min(currentPage, totalPages));

  const start = (currentPage - 1) * PAGE_SIZE;
  const page  = paginatedRows.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = page.map(r => `
    <tr>
      <td>${r.MARCA_ITV || '—'}</td>
      <td>${r.MODELO_ITV || '—'}</td>
      <td class="num">${formatKw(r.KW_ITV)}</td>
      <td class="count">${parseInt(r.COUNT, 10).toLocaleString('es-ES')}</td>
    </tr>
  `).join('');

  btnPrev.disabled = currentPage <= 1;
  btnNext.disabled = currentPage >= totalPages;
  pageDisplay.textContent = `${currentPage} / ${totalPages}`;
  paginationInfo.textContent = totalPages > 1
    ? `${start + 1}–${Math.min(start + PAGE_SIZE, paginatedRows.length)} de ${paginatedRows.length}`
    : '';
}

function wirePagination() {
  document.getElementById('btn-prev').addEventListener('click', () => { currentPage--; renderPage(); });
  document.getElementById('btn-next').addEventListener('click', () => { currentPage++; renderPage(); });
}

function updateChartTotal(total) {
  const el = document.getElementById('chart-total');
  el.innerHTML = total
    ? `Total: <strong>${total.toLocaleString('es-ES')}</strong> motos eléctricas`
    : '';
}

// ── Brand pie chart ───────────────────────────────────────────────────────────

function renderBrandPieChart(modeloRows) {
  const wrap   = document.getElementById('chart-wrap');
  const empty  = document.getElementById('chart-empty');
  const canvas = document.getElementById('brand-pie-chart');

  if (brandPieChart) { brandPieChart.destroy(); brandPieChart = null; }

  if (!modeloRows.length) {
    wrap.style.display  = 'none';
    empty.style.display = 'flex';
    return;
  }

  // Aggregate by brand
  const byBrand = {};
  for (const r of modeloRows) {
    const b = r.MARCA_ITV || '—';
    byBrand[b] = (byBrand[b] || 0) + parseInt(r.COUNT, 10);
  }

  const sorted = Object.entries(byBrand).sort((a, b) => b[1] - a[1]);
  const top    = sorted.slice(0, 10);
  const others = sorted.slice(10).reduce((s, [, v]) => s + v, 0);

  const labels = top.map(([b]) => b);
  const data   = top.map(([, v]) => v);
  const colors = top.map((_, i) => BRAND_PALETTE[i % BRAND_PALETTE.length]);

  if (others > 0) {
    labels.push('Otros');
    data.push(others);
    colors.push('#475569');
  }

  const total = data.reduce((s, v) => s + v, 0);

  wrap.style.display  = 'block';
  empty.style.display = 'none';

  brandPieChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderColor: '#0f1115', borderWidth: 2 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { color: '#94a3b8', font: { family: 'Inter', size: 10 }, padding: 8, boxWidth: 12 },
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return ` ${ctx.parsed.toLocaleString('es-ES')} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

// ── Carnet doughnut ───────────────────────────────────────────────────────────

function renderCarnetChart(potenciaRows) {
  const wrap   = document.getElementById('carnet-chart-wrap');
  const empty  = document.getElementById('carnet-chart-empty');
  const canvas = document.getElementById('carnet-chart');

  if (carnetChart) { carnetChart.destroy(); carnetChart = null; }

  const counts = POWER_BANDS.map(b => {
    const r = potenciaRows.find(r => r.RANGO_POTENCIA === b);
    return r ? parseInt(r.COUNT, 10) : 0;
  });
  const total = counts.reduce((s, v) => s + v, 0);

  if (!total) {
    wrap.style.display  = 'none';
    empty.style.display = 'flex';
    return;
  }

  wrap.style.display  = 'block';
  empty.style.display = 'none';

  carnetChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['A1 (≤11 kW)', 'A2 (11–35 kW)', 'A (>35 kW)'],
      datasets: [{
        data: counts,
        backgroundColor: POWER_COLORS,
        borderColor: '#0f1115',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, padding: 12 },
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return ` ${ctx.parsed.toLocaleString('es-ES')} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

// ── Evolution charts ──────────────────────────────────────────────────────────

async function loadEvolutionData() {
  if (evolutionLoaded) return;
  evolutionLoaded = true;

  const loadingEl = document.getElementById('evolution-loading');
  loadingEl.style.display = 'block';

  try {
    const now = new Date();
    const years = [];
    for (let y = 2025; y <= now.getFullYear(); y++) years.push(String(y));

    const [potenciaResults, marcaResults] = await Promise.all([
      Promise.allSettled(years.map(y => fetchCsv(`${E_DATA_BASE}/${y}/acumulado-potencia-anual.csv`))),
      Promise.allSettled(years.map(y => fetchCsv(`${E_DATA_BASE}/${y}/acumulado-marca-anual.csv`))),
    ]);

    const potenciaByYear = {}, marcaByYear = {};
    years.forEach((y, i) => {
      if (potenciaResults[i].status === 'fulfilled') potenciaByYear[y] = potenciaResults[i].value;
      if (marcaResults[i].status === 'fulfilled')   marcaByYear[y]    = marcaResults[i].value;
    });

    renderPowerEvolution(years, potenciaByYear);
    renderBrandEvolution(years, marcaByYear);
  } finally {
    document.getElementById('evolution-loading').style.display = 'none';
  }
}

function renderPowerEvolution(years, potenciaByYear) {
  const canvas = document.getElementById('powerEvolutionChart');
  if (powerEvolutionChart) powerEvolutionChart.destroy();

  const datasets = POWER_BANDS.map((band, i) => ({
    label: band,
    data: years.map(y => {
      const r = (potenciaByYear[y] || []).find(r => r.RANGO_POTENCIA === band);
      return r ? parseInt(r.COUNT, 10) : 0;
    }),
    backgroundColor: POWER_COLORS[i],
    borderRadius: 4,
  }));

  powerEvolutionChart = new Chart(canvas, {
    type: 'bar',
    data: { labels: years, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } },
      },
      scales: {
        x: { stacked: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { stacked: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
      },
    },
  });
}

function renderBrandEvolution(years, marcaByYear) {
  const canvas = document.getElementById('brandEvolutionChart');
  if (brandEvolutionChart) brandEvolutionChart.destroy();

  const totals = {};
  for (const rows of Object.values(marcaByYear)) {
    for (const r of rows) totals[r.MARCA_ITV] = (totals[r.MARCA_ITV] || 0) + parseInt(r.COUNT, 10);
  }
  const top15 = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([b]) => b);

  const datasets = top15.map((brand, i) => ({
    label: brand,
    data: years.map(y => {
      const r = (marcaByYear[y] || []).find(r => r.MARCA_ITV === brand);
      return r ? parseInt(r.COUNT, 10) : 0;
    }),
    backgroundColor: BRAND_PALETTE[i % BRAND_PALETTE.length],
    borderRadius: 4,
  }));

  brandEvolutionChart = new Chart(canvas, {
    type: 'bar',
    data: { labels: years, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: {
          display: true,
          position: 'right',
          labels: { color: '#94a3b8', font: { family: 'Inter', size: 10 }, boxWidth: 12 },
        },
      },
      scales: {
        x: { stacked: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
        y: { stacked: true, ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
      },
    },
  });
}

// ── Tab wiring ────────────────────────────────────────────────────────────────

function wireTabEvolution() {
  document.getElementById('tab-evolucion').addEventListener('change', function () {
    if (this.checked) loadEvolutionData();
  });
}

function wireTabHash() {
  ['tab-datos', 'tab-evolucion', 'tab-info'].forEach(id => {
    document.getElementById(id).addEventListener('change', function () {
      if (this.checked) location.hash = id.replace('tab-', '');
    });
  });

  const savedTab = 'tab-' + location.hash.slice(1);
  if (['tab-datos', 'tab-evolucion', 'tab-info'].includes(savedTab)) {
    document.getElementById(savedTab).checked = true;
    if (savedTab === 'tab-evolucion') loadEvolutionData();
  }
}

// ── Footer ────────────────────────────────────────────────────────────────────

async function populateFooter() {
  try {
    const now = new Date();
    let latestDate = null;

    outer: for (let y = now.getFullYear(); y >= 2025; y--) {
      for (let m = 12; m >= 1; m--) {
        const month = String(m).padStart(2, '0');
        try {
          const rows = await fetchCsv(`${E_DATA_BASE}/${y}/${month}/acumulado-marca-mensual.csv`);
          if (rows.length) { latestDate = `${MONTHS[m - 1]} ${y}`; break outer; }
        } catch { /* try previous */ }
      }
    }

    if (latestDate) document.getElementById('footer-last-run').textContent = latestDate;
  } catch { /* non-critical */ }
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  populateSelectors();
  wireFilters();
  wirePagination();
  wireTabEvolution();
  wireTabHash();
  populateFooter();
});
