// ====== Clé de stockage ======
const STORAGE_KEY = 'stopaddict:data';

// ====== Selecteurs ======
const $ = (id) => document.getElementById(id);

const $btnImport = $('btnImport');
const $btnExport = $('btnExport');
const $fileJson  = $('fileJson');
const $feedback  = $('feedback');
const $preview   = $('preview');

const $ecoAmount = $('economies-amount');

// Agenda
const $agDate = $('agDate');
const $agCigs = $('agCigs');
const $agAdd  = $('agAdd');
const $agList = $('agList');

// Stats
const $tabDay   = $('tabDay');
const $tabWeek  = $('tabWeek');
const $tabMonth = $('tabMonth');
const $chart    = $('chart');
const $legend   = $('chartLegend');

// ====== Helpers ======
function showFeedback(msg, type = 'info') {
  if (!$feedback) return;
  $feedback.className = `feedback ${type}`;
  $feedback.textContent = msg;
}

function getData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : { settings: { pricePerPack: 0, cigsPerPack: 20 }, entries: [] };
}
function setData(d) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

function to2(n) { return n.toString().padStart(2, '0'); }
function localDayKey(d) {
  return `${d.getFullYear()}-${to2(d.getMonth()+1)}-${to2(d.getDate())}`;
}

// ====== Import JSON ======
async function onImportFromFile(file) {
  try {
    const text = await file.text();
    const json = JSON.parse(text);

    if (!json || typeof json !== 'object' || !Array.isArray(json.entries)) {
      showFeedback("Fichier invalide (pas de 'entries').", 'error');
      return;
    }

    setData(json);

    if ($preview) {
      $preview.hidden = false;
      $preview.textContent = JSON.stringify(json, null, 2);
    }

    renderAgenda();
    renderEconomies();
    renderChart(); // MAJ graphique
    showFeedback('Import réussi. Données enregistrées (local).', 'ok');
  } catch (e) {
    console.error(e);
    showFeedback('Erreur pendant l’import (format JSON ?).', 'error');
  }
}

if ($btnImport) $btnImport.addEventListener('click', () => $fileJson?.click());
if ($fileJson)  $fileJson.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) onImportFromFile(file);
});

// ====== Export CSV ======
function exportCSV() {
  const data = getData();
  const rows = [];
  rows.push(['date', 'cigarettes']); // entête simple
  for (const e of (data.entries || [])) {
    rows.push([e.date, Number(e.cigarettes || 0)]);
  }
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'stopaddict.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showFeedback('Export CSV généré.', 'ok');
}
if ($btnExport) $btnExport.addEventListener('click', exportCSV);

// ====== Économies ======
function renderEconomies() {
  if (!$ecoAmount) return;

  const data = getData();
  const settings = data.settings || {};
  const pricePerPack = Number(settings.pricePerPack || 0);
  const cigsPerPack  = Number(settings.cigsPerPack || 20);

  const totalCigs = (data.entries || []).reduce((s, e) => s + Number(e.cigarettes || 0), 0);
  if (!pricePerPack || !cigsPerPack || !totalCigs) {
    $ecoAmount.textContent = '—';
    return;
  }
  const packs = totalCigs / cigsPerPack;
  const euros = packs * pricePerPack;
  $ecoAmount.textContent = `${euros.toFixed(2)} € (≈ ${packs.toFixed(2)} paquets)`;
}

// ====== Agenda (ajout + rendu) ======
function initAgenda() {
  if ($agDate) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    $agDate.value = now.toISOString().slice(0, 16);
  }
  if ($agAdd) $agAdd.addEventListener('click', onAgendaAdd);
}

function onAgendaAdd() {
  const isoLocal = $agDate?.value;
  const cigs     = Number($agCigs?.value || 0);

  if (!isoLocal || !cigs) {
    showFeedback('Renseigne la date/heure et la quantité.', 'error');
    return;
  }
  const date = new Date(isoLocal); // local → UTC automatique via toISOString

  const data = getData();
  data.entries.push({ date: date.toISOString(), cigarettes: cigs });
  data.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
  setData(data);

  if ($agCigs) $agCigs.value = '';
  renderAgenda();
  renderEconomies();
  renderChart();
  showFeedback('Ajout enregistré.', 'ok');
}

function renderAgenda() {
  if (!$agList) return;

  const data = getData();
  const byDay = {};
  for (const e of (data.entries || [])) {
    const d = new Date(e.date);
    const day = localDayKey(d);
    (byDay[day] ||= []).push(e);
  }

  const days = Object.keys(byDay).sort().reverse().slice(0, 30);
  let html = '';
  for (const day of days) {
    const total = byDay[day].reduce((s, e) => s + Number(e.cigarettes || 0), 0);
    html += `<li class="day">${day} — ${total} clopes</li>`;
    for (const e of byDay[day]) {
      const d = new Date(e.date);
      const t = `${to2(d.getHours())}:${to2(d.getMinutes())}`;
      html += `<li>${t} · ${e.cigarettes}</li>`;
    }
  }
  $agList.innerHTML = html || '<li>Aucune donnée</li>';
}

// ====== Stats / Graphique ======
let chartMode = 'day'; // 'day' | 'week' | 'month'
if ($tabDay)   $tabDay.addEventListener('click', () => { setTab('day'); });
if ($tabWeek)  $tabWeek.addEventListener('click', () => { setTab('week'); });
if ($tabMonth) $tabMonth.addEventListener('click', () => { setTab('month'); });

function setTab(m) {
  chartMode = m;
  for (const el of [$tabDay, $tabWeek, $tabMonth]) el?.classList.remove('active');
  if (m === 'day')   $tabDay?.classList.add('active');
  if (m === 'week')  $tabWeek?.classList.add('active');
  if (m === 'month') $tabMonth?.classList.add('active');
  renderChart();
}

function aggregateForChart(mode) {
  const data = getData();
  const entries = data.entries || [];

  // Convertit en local
  const mapped = entries.map(e => ({ d: new Date(e.date), v: Number(e.cigarettes || 0) }));

  if (mode === 'day') {
    // cible : aujourd’hui en local
    const now = new Date();
    const dayKey = localDayKey(now);
    const hours = Array(24).fill(0);
    for (const { d, v } of mapped) {
      if (localDayKey(d) === dayKey) {
        hours[d.getHours()] += v;
      }
    }
    return {
      labels: Array.from({ length: 24 }, (_, i) => `${to2(i)}h`),
      values: hours,
      limit: Number((data.settings || {}).dailyLimit || 0),
      title: `Aujourd'hui`
    };
  }

  if (mode === 'week') {
    // derniers 7 jours glissants (local)
    const days = [];
    const totals = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = localDayKey(d);
      days.push(key);
      totals.push(0);
    }
    for (const { d, v } of mapped) {
      const key = localDayKey(d);
      const idx = days.indexOf(key);
      if (idx !== -1) totals[idx] += v;
    }
    return { labels: days, values: totals, limit: 0, title: '7 derniers jours' };
  }

  // month : derniers 30 jours glissants
  const days = [];
  const totals = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = localDayKey(d);
    days.push(key);
    totals.push(0);
  }
  for (const { d, v } of mapped) {
    const key = localDayKey(d);
    const idx = days.indexOf(key);
    if (idx !== -1) totals[idx] += v;
  }
  return { labels: days, values: totals, limit: 0, title: '30 derniers jours' };
}

function renderChart() {
  if (!$chart) return;
  const ctx = $chart.getContext('2d');
  const DPR = window.devicePixelRatio || 1;

  // Nettoyage
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,$chart.width,$chart.height);
  ctx.restore();

  const { labels, values, limit, title } = aggregateForChart(chartMode);
  const W = $chart.width, H = $chart.height;

  // Marges
  const m = { top: 30, right: 16, bottom: 40, left: 40 };
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;

  // Échelle
  const maxVal = Math.max(1, Math.max(...values, limit || 0));
  const barW = plotW / values.length * 0.8;
  const stepX = plotW / values.length;

  // Axes
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(m.left, H - m.bottom);
  ctx.lineTo(W - m.right, H - m.bottom);
  ctx.moveTo(m.left, m.top);
  ctx.lineTo(m.left, H - m.bottom);
  ctx.stroke();

  // Titre
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  ctx.fillText(title, m.left, m.top - 10);

  // Barres
  for (let i = 0; i < values.length; i++) {
    const x = m.left + i * stepX + (stepX - barW)/2;
    const h = Math.round(values[i] / maxVal * plotH);
    const y = H - m.bottom - h;

    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(x, y, barW, h);

    // Labels X espacés (éviter surcharge)
    if (i % Math.ceil(values.length / 8) === 0 || i === values.length - 1) {
      ctx.fillStyle = '#475569';
      ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
      const lab = labels[i];
      const tw = ctx.measureText(lab).width;
      ctx.fillText(lab, x + barW/2 - tw/2, H - m.bottom + 14);
    }
  }

  // Ligne de limite (jour seulement si définie)
  if (chartMode === 'day' && limit > 0) {
    const ly = H - m.bottom - Math.round(limit / maxVal * plotH);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6,4]);
    ctx.beginPath();
    ctx.moveTo(m.left, ly);
    ctx.lineTo(W - m.right, ly);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ====== Boot ======
document.addEventListener('DOMContentLoaded', () => {
  initAgenda();
  renderAgenda();
  renderEconomies();
  setTab('day'); // active + rendu
});
