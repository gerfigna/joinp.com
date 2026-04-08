    // ── Constants ─────────────────────────────────────────────────────────────

    const PAGE_SIZE = 30;
    const START_YEAR = 2025;
    const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    const CHART_COLORS = [
      '#6366f1','#22d3ee','#f59e0b','#10b981','#f43f5e',
      '#a855f7','#3b82f6','#84cc16','#fb923c','#14b8a6',
      '#e879f9','#facc15','#60a5fa','#34d399','#fb7185',
    ];

    // ── State ─────────────────────────────────────────────────────────────────

    let rawData = [];
    let filteredData = [];
    let currentPage = 1;
    let pieChart = null;
    let comunidadProvinciaMap = new Map();

    // ── DOM refs ──────────────────────────────────────────────────────────────

    const selYear      = document.getElementById('sel-year');
    const selMonth     = document.getElementById('sel-month');
    const selBrand     = document.getElementById('sel-brand');
    const selComunidad = document.getElementById('sel-comunidad');
    const selProvince  = document.getElementById('sel-province');
    const inpCcMin    = document.getElementById('inp-cc-min');
    const inpCcMax    = document.getElementById('inp-cc-max');
    const btnReset    = document.getElementById('btn-reset');
    const tableBody   = document.getElementById('table-body');
    const tableWrap   = document.querySelector('.table-wrap');


    const btnPrev     = document.getElementById('btn-prev');
    const btnNext     = document.getElementById('btn-next');
    const pageDisplay = document.getElementById('page-display');
    const paginationInfo = document.getElementById('pagination-info');
    const chartWrap   = document.getElementById('chart-wrap');
    const chartEmpty  = document.getElementById('chart-empty');
    const chartTotal  = document.getElementById('chart-total');

    // ── Year/Month selectors ──────────────────────────────────────────────────

    function buildSelectors() {
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth() + 1;

      for (let y = START_YEAR; y <= curYear; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        selYear.appendChild(opt);
      }

      for (let m = 1; m <= 12; m++) {
        const opt = document.createElement('option');
        opt.value = String(m).padStart(2, '0');
        opt.textContent = MONTH_NAMES[m - 1];
        selMonth.appendChild(opt);
      }

      // Default to current month (or Dec of start year if before start)
      selYear.value = curYear >= START_YEAR ? curYear : START_YEAR;
      selMonth.value = String(curMonth).padStart(2, '0');
    }

    function updateMonthOptions() {
      const curYear = new Date().getFullYear();
      const curMonth = new Date().getMonth() + 1;
      const selectedYear = parseInt(selYear.value, 10);
      const currentMonth = selectedYear === curYear ? curMonth : 12;

      Array.from(selMonth.options).forEach((opt, idx) => {
        const month = idx + 1;
        opt.disabled = month > currentMonth;
      });

      if (parseInt(selMonth.value, 10) > currentMonth) {
        selMonth.value = String(currentMonth).padStart(2, '0');
      }

      fetchData();
    }

    // ── CSV fetch + parse ─────────────────────────────────────────────────────

    function parseCSV(text) {
      const lines = text.trim().split('\n');
      if (lines.length < 2) return [];
      const headers = splitCSVLine(lines[0]);
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = splitCSVLine(lines[i]);
        if (vals.length !== headers.length) continue;
        const row = {};
        headers.forEach((h, idx) => { row[h] = vals[idx]; });
        row.COUNT = parseInt(row.COUNT, 10) || 0;
        row.CILINDRADA_ITV = parseInt(row.CILINDRADA_ITV, 10) || 0;
        rows.push(row);
      }
      return rows;
    }

    function splitCSVLine(line) {
      const result = [];
      let cur = '';
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuote = !inQuote;
        } else if (ch === ',' && !inQuote) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += ch;
        }
      }
      result.push(cur.trim());
      return result;
    }

    async function fetchData() {
      const year = selYear.value;
      const month = selMonth.value;
      const path = `/microdatos-etl/data/${year}/${month}/acumulado-marca-modelo-provincia.csv`;

      rawData = [];

      const showSpinner = () => {
        tableWrap.classList.add('table-loading');
        const spinner = document.createElement('div');
        spinner.className = 'spinner-overlay';
        spinner.id = 'table-spinner';
        tableWrap.appendChild(spinner);
      };

      const hideSpinner = () => {
        const spinner = document.getElementById('table-spinner');
        if (spinner) spinner.remove();
        tableWrap.classList.remove('table-loading');
      };

      let loadError = false;

      const spinnerTimeout = setTimeout(showSpinner, 500);

      try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        rawData = parseCSV(text);
      } catch (e) {
        loadError = true;
        rawData = [];
      } finally {
        clearTimeout(spinnerTimeout);
        hideSpinner();
      }

      if (loadError) {
        showEmpty('Error al cargar los datos. Inténtalo de nuevo.');
        return;
      }

      populateDropdowns();
      applyFiltersAndRender();
    }

    // ── Dropdowns ─────────────────────────────────────────────────────────────

    function populateDropdowns() {
      const brands = [...new Set(rawData.map(r => r.MARCA_ITV))].sort();

      // Build comunidad → provinces map
      comunidadProvinciaMap = new Map();
      for (const row of rawData) {
        const cc = row.COMUNIDAD_AUTONOMA;
        const pv = row.PROVINCIA_VEH;
        if (!comunidadProvinciaMap.has(cc)) comunidadProvinciaMap.set(cc, new Set());
        comunidadProvinciaMap.get(cc).add(pv);
      }

      const comunidades = [...comunidadProvinciaMap.keys()].sort();
      rebuildSelect(selBrand, brands, 'Todas las marcas');
      rebuildSelect(selComunidad, comunidades, 'Todas las comunidades');
      repopulateProvinces(selComunidad.value);
    }

    function repopulateProvinces(selectedComunidad) {
      let provinces;
      if (!selectedComunidad) {
        provinces = [...new Set(rawData.map(r => r.PROVINCIA_VEH))].sort();
      } else {
        provinces = [...(comunidadProvinciaMap.get(selectedComunidad) || [])].sort();
      }
      rebuildSelect(selProvince, provinces, 'Todas las provincias');
    }

    function rebuildSelect(sel, options, placeholder) {
      const prev = sel.value;
      sel.innerHTML = `<option value="">${placeholder}</option>`;
      options.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        sel.appendChild(opt);
      });
      // Restore previous selection if still valid
      if (prev && options.includes(prev)) sel.value = prev;
      else sel.value = '';
    }

    // ── Filters ───────────────────────────────────────────────────────────────

    function applyFilters(data, filters) {
      const { brand, comunidad, province, ccMin, ccMax } = filters;
      return data.filter(row => {
        if (brand     && row.MARCA_ITV         !== brand)     return false;
        if (comunidad && row.COMUNIDAD_AUTONOMA !== comunidad) return false;
        if (province  && row.PROVINCIA_VEH      !== province)  return false;
        if (ccMin !== '' && !isNaN(ccMin) && row.CILINDRADA_ITV < Number(ccMin)) return false;
        if (ccMax !== '' && !isNaN(ccMax) && row.CILINDRADA_ITV > Number(ccMax)) return false;
        return true;
      });
    }

    function getFilters() {
      return {
        brand:     selBrand.value,
        comunidad: selComunidad.value,
        province:  selProvince.value,
        ccMin:     inpCcMin.value,
        ccMax:     inpCcMax.value,
      };
    }

    function aggregateByMarcaModelo(data) {
      const map = {};
      data.forEach(row => {
        const key = `${row.MARCA_ITV}\x00${row.MODELO_ITV}\x00${row.CILINDRADA_ITV}`;
        if (!map[key]) map[key] = { MARCA_ITV: row.MARCA_ITV, MODELO_ITV: row.MODELO_ITV, CILINDRADA_ITV: row.CILINDRADA_ITV, COUNT: 0 };
        map[key].COUNT += row.COUNT;
      });
      return Object.values(map);
    }

    function applyFiltersAndRender() {
      const filters = getFilters();
      const filtered = applyFilters(rawData, filters);
      filteredData = filters.province ? filtered : aggregateByMarcaModelo(filtered);
      sortData();
      currentPage = 1;
      renderTable();
      renderChart();
    }

    // ── Sort ──────────────────────────────────────────────────────────────────

    function sortData() {
      filteredData.sort((a, b) => Number(b.COUNT) - Number(a.COUNT));
    }

    // ── Table render ──────────────────────────────────────────────────────────

    function renderTable() {
      const total = filteredData.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      if (currentPage > totalPages) currentPage = totalPages;

      const start = (currentPage - 1) * PAGE_SIZE;
      const pageRows = filteredData.slice(start, start + PAGE_SIZE);

      if (total === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="4">Sin resultados para los filtros seleccionados</td></tr>';
      } else {
        tableBody.innerHTML = pageRows.map(row => `
          <tr>
            <td>${esc(row.MARCA_ITV)}</td>
            <td>${esc(row.MODELO_ITV)}</td>
            <td class="num hide-mobile">${row.CILINDRADA_ITV.toLocaleString('es')}</td>
            <td class="count">${row.COUNT.toLocaleString('es')}</td>
          </tr>
        `).join('');
      }

      // Pagination
      const showing = total === 0 ? 0 : start + 1;
      const showingEnd = Math.min(start + PAGE_SIZE, total);

      paginationInfo.textContent = total === 0 ? '' : `Mostrando ${showing}–${showingEnd} de ${total.toLocaleString('es')}`;
      pageDisplay.textContent = total === 0 ? '' : `Página ${currentPage} / ${totalPages}`;
      btnPrev.disabled = currentPage <= 1;
      btnNext.disabled = currentPage >= totalPages;
    }

    function esc(str) {
      return String(str ?? '')
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;');
    }

    // ── Chart ─────────────────────────────────────────────────────────────────

    function aggregateByBrand(data) {
      const map = {};
      data.forEach(row => {
        map[row.MARCA_ITV] = (map[row.MARCA_ITV] || 0) + row.COUNT;
      });
      return Object.entries(map)
        .map(([brand, count]) => ({ brand, count }))
        .sort((a, b) => b.count - a.count);
    }

    function renderChart() {
      const agg = aggregateByBrand(filteredData);
      const total = agg.reduce((s, r) => s + r.count, 0);

      if (agg.length === 0 || total === 0) {
        chartWrap.style.display = 'none';
        chartEmpty.style.display = 'flex';
        chartTotal.textContent = '';
        if (pieChart) { pieChart.destroy(); pieChart = null; }
        return;
      }

      chartWrap.style.display = 'block';
      chartEmpty.style.display = 'none';
      chartTotal.innerHTML = `Total: <strong>${total.toLocaleString('es')}</strong> matriculaciones`;

      // Group small slices into "Otros"
      const TOP_N = 14;
      const top = agg.slice(0, TOP_N);
      const rest = agg.slice(TOP_N);
      const labels = top.map(r => r.brand);
      const values = top.map(r => r.count);
      if (rest.length > 0) {
        labels.push('Otros');
        values.push(rest.reduce((s, r) => s + r.count, 0));
      }

      const colors = labels.map((_, i) => i < CHART_COLORS.length ? CHART_COLORS[i] : '#64748b');

      if (pieChart) {
        pieChart.data.labels = labels;
        pieChart.data.datasets[0].data = values;
        pieChart.data.datasets[0].backgroundColor = colors;
        pieChart.update();
      } else {
        const ctx = document.getElementById('pie-chart').getContext('2d');
        pieChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels,
            datasets: [{
              data: values,
              backgroundColor: colors,
              borderColor: '#1a1d24',
              borderWidth: 3,
              borderRadius: 6,
              hoverOffset: 8,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            layout: {
              padding: { top: 10, bottom: 10 }
            },
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: '#94a3b8',
                  font: { size: 11, family: "'Inter', sans-serif" },
                  usePointStyle: true,
                  boxWidth: 8,
                  padding: 15,
                }
              },
              tooltip: {
                callbacks: {
                  label(ctx) {
                    const dataTotal = ctx.dataset.data.reduce((s, v) => s + v, 0);
                    const pct = ((ctx.parsed / dataTotal) * 100).toFixed(1);
                    return ` ${ctx.parsed.toLocaleString('es')} unidades (${pct}%)`;
                  }
                }
              }
            }
          }
        });
      }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────


    function showEmpty(msg) {
      tableBody.innerHTML = `<tr class="empty-row"><td colspan="4">${esc(msg)}</td></tr>`;
    }

    // ── Event wiring ──────────────────────────────────────────────────────────

    selYear.addEventListener('change', () => { updateMonthOptions(); });
    selMonth.addEventListener('change', fetchData);
    selBrand.addEventListener('change', applyFiltersAndRender);
    selComunidad.addEventListener('change', () => {
      repopulateProvinces(selComunidad.value);
      applyFiltersAndRender();
    });
    selProvince.addEventListener('change', applyFiltersAndRender);
    inpCcMin.addEventListener('input', applyFiltersAndRender);
    inpCcMax.addEventListener('input', applyFiltersAndRender);

    btnReset.addEventListener('click', () => {
      selBrand.value     = '';
      selComunidad.value = '';
      repopulateProvinces('');
      selProvince.value  = '';
      inpCcMin.value     = '';
      inpCcMax.value     = '';
      applyFiltersAndRender();
    });

    btnPrev.addEventListener('click', () => { currentPage--; renderTable(); });
    btnNext.addEventListener('click', () => { currentPage++; renderTable(); });

    // ── Footer metadata ───────────────────────────────────────────────────────

    async function loadMetadata() {
      try {
        const res = await fetch('/microdatos-etl/data/metadata.json');
        if (!res.ok) return;
        const meta = await res.json();

        if (meta.lastRun) {
          const d = new Date(meta.lastRun);
          document.getElementById('footer-last-run').textContent =
            d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
        }

        if (meta.lastDataDate) {
          const [year, month, day] = meta.lastDataDate.split('-');
          document.getElementById('footer-last-date').textContent =
            `${day}/${month}/${year}`;
        }
      } catch (_) {
        // silently ignore if metadata not available
      }
    }

    // ── Evolution charts ──────────────────────────────────────────────────────

    const POWER_RANGES = ['Hasta 11 kW', '11-35 kW', 'Más de 35 kW'];
    const POWER_COLORS = ['#4e79a7', '#f28e2b', '#e15759'];
    const BRAND_COLORS = [
      '#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f',
      '#edc948','#b07aa1','#ff9da7','#9c755f','#bab0ac',
      '#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd',
      '#8c564b','#e377c2','#7f7f7f','#bcbd22','#17becf',
      '#aec7e8'
    ];

    let evolutionData = null;
    let powerChart = null;
    let brandChart = null;

    async function loadEvolutionData() {
      if (evolutionData !== null) return;

      document.getElementById('evolution-loading').style.display = 'block';

      const currentYear = new Date().getFullYear();
      const years = [];
      for (let y = 2015; y <= currentYear; y++) years.push(y);

      const results = await Promise.all(years.map(async (year) => {
        try {
          const [powerRes, brandRes] = await Promise.all([
            fetch(`/microdatos-etl/data/${year}/acumulado-potencia-anual.csv`),
            fetch(`/microdatos-etl/data/${year}/acumulado-marca-anual.csv`)
          ]);
          if (!powerRes.ok || !brandRes.ok) return null;
          const [powerText, brandText] = await Promise.all([powerRes.text(), brandRes.text()]);
          return {
            year,
            power: parseCSV(powerText),
            brands: parseCSV(brandText)
          };
        } catch (_) { return null; }
      }));

      evolutionData = results.filter(r => r !== null);
      document.getElementById('evolution-loading').style.display = 'none';

      renderEvolutionCharts();
    }

    function getTopBrands(n = 30) {
      const totals = {};
      const maxYear = Math.max(...evolutionData.map(d => d.year));
      evolutionData
        .filter(d => d.year >= maxYear - 2)
        .forEach(({ brands }) => {
          brands.forEach(row => {
            totals[row.MARCA_ITV] = (totals[row.MARCA_ITV] || 0) + row.COUNT;
          });
        });
      return Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([name]) => name);
    }

    function buildPowerChartData(mode) {
      return POWER_RANGES.map((range, i) => ({
        label: range,
        backgroundColor: POWER_COLORS[i],
        data: evolutionData.map(({ power }) => {
          const row = power.find(r => r.RANGO_POTENCIA === range);
          const val = row ? row.COUNT : 0;
          if (mode === 'percent') {
            const total = power.reduce((s, r) => s + r.COUNT, 0);
            return total ? Math.round(val / total * 1000) / 10 : 0;
          }
          return val;
        })
      }));
    }

    function buildBrandsChartData(topBrands, mode) {
      const currentYear = new Date().getFullYear();
      const visibleData = mode === 'percent'
        ? evolutionData
        : evolutionData.filter(d => d.year < currentYear);
      const topBrandsSet = new Set(topBrands);
      const datasets = topBrands.map((brand, i) => ({
        label: brand,
        borderColor: BRAND_COLORS[i % BRAND_COLORS.length],
        backgroundColor: BRAND_COLORS[i % BRAND_COLORS.length],
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        ...(i >= 15 ? { hidden: true } : {}),
        data: visibleData.map(({ brands }) => {
          const row = brands.find(r => r.MARCA_ITV === brand);
          const val = row ? row.COUNT : 0;
          if (mode === 'percent') {
            const total = brands.reduce((s, r) => s + r.COUNT, 0);
            return total ? Math.round(val / total * 1000) / 10 : 0;
          }
          return val;
        })
      }));

      return datasets;
    }

    function brandYears(mode) {
      const currentYear = new Date().getFullYear();
      return evolutionData
        .filter(d => mode === 'percent' || d.year < currentYear)
        .map(d => d.year);
    }

    function renderEvolutionCharts() {
      const years = evolutionData.map(d => d.year);
      const powerMode = document.querySelector('input[name="power-mode"]:checked').value;
      const brandMode = document.querySelector('input[name="brand-mode"]:checked').value;

      if (powerChart) powerChart.destroy();
      if (brandChart) brandChart.destroy();

      const topBrands = getTopBrands(30);

      const stackedOptions = (mode) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { size: 11 },
              boxWidth: 12,
              padding: 10,
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: '#94a3b8' },
            grid: { color: '#1e293b' }
          },
          y: {
            stacked: true,
            ticks: { color: '#94a3b8' },
            grid: { color: '#1e293b' },
            title: {
              display: true,
              text: mode === 'percent' ? '%' : 'Matrículas',
              color: '#94a3b8'
            }
          }
        }
      });

      const lineOptions = (mode) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { size: 11 },
              boxWidth: 12,
              padding: 10,
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8' },
            grid: { color: '#1e293b' }
          },
          y: {
            ticks: { color: '#94a3b8' },
            grid: { color: '#1e293b' },
            title: {
              display: true,
              text: mode === 'percent' ? '%' : 'Matrículas',
              color: '#94a3b8'
            }
          }
        }
      });

      powerChart = new Chart(document.getElementById('powerChart'), {
        type: 'bar',
        data: { labels: years, datasets: buildPowerChartData(powerMode) },
        options: stackedOptions(powerMode)
      });

      brandChart = new Chart(document.getElementById('brandChart'), {
        type: 'line',
        data: { labels: brandYears(brandMode), datasets: buildBrandsChartData(topBrands, brandMode) },
        options: lineOptions(brandMode)
      });
    }

    // Mode toggle listeners
    document.querySelectorAll('input[name="power-mode"]').forEach(r => {
      r.addEventListener('change', () => {
        if (!evolutionData) return;
        const mode = document.querySelector('input[name="power-mode"]:checked').value;
        powerChart.data.datasets = buildPowerChartData(mode);
        powerChart.options.scales.y.title.text = mode === 'percent' ? '%' : 'Matrículas';
        powerChart.update();
      });
    });

    document.querySelectorAll('input[name="brand-mode"]').forEach(r => {
      r.addEventListener('change', () => {
        if (!evolutionData) return;
        const topBrands = getTopBrands(30);
        const mode = document.querySelector('input[name="brand-mode"]:checked').value;
        brandChart.data.labels = brandYears(mode);
        brandChart.data.datasets = buildBrandsChartData(topBrands, mode);
        brandChart.options.scales.y.title.text = mode === 'percent' ? '%' : 'Matrículas';
        brandChart.update();
      });
    });

    // Lazy load on tab activation
    document.getElementById('tab-evolucion').addEventListener('change', () => {
      loadEvolutionData();
    });

    // ── Init ──────────────────────────────────────────────────────────────────

    buildSelectors();
    updateMonthOptions();
    fetchData();
    loadMetadata();
