// ====== Config stockage ======
const STORAGE_KEY = 'stopaddict:data';

// ====== Helpers DOM ======
const $ = (id) => document.getElementById(id);

const $btnImport = $('btnImport');
const $fileJson  = $('fileJson');
const $feedback  = $('feedback');
const $preview   = $('preview');

const $ecoAmount = $('economies-amount');

// Agenda
const $agDate = $('agDate');
const $agCigs = $('agCigs');
const $agAdd  = $('agAdd');
const $agList = $('agList');

// ====== Utilitaires ======
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

// ====== Import JSON ======
async function onImportFromFile(file) {
  try {
    const text = await file.text();
    const json = JSON.parse(text);

    // Validation simple
    if (!json || typeof json !== 'object' || !Array.isArray(json.entries)) {
      showFeedback("Fichier invalide (pas de 'entries').", 'error');
      return;
    }

    setData(json);

    // Affiche un aperçu
    if ($preview) {
      $preview.hidden = false;
      $preview.textContent = JSON.stringify(json, null, 2);
    }

    // MAJ UI dépendantes
    renderAgenda();
    renderEconomies();

    showFeedback('Import réussi. Données enregistrées (local).', 'ok');
  } catch (e) {
    console.error(e);
    showFeedback('Erreur pendant l’import (format JSON ?).', 'error');
  }
}

if ($btnImport) {
  $btnImport.addEventListener('click', () => $fileJson?.click());
}
if ($fileJson) {
  $fileJson.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) onImportFromFile(file);
  });
}

// ====== Économies (estimation simple) ======
function renderEconomies() {
  if (!$ecoAmount) return;

  const data = getData();
  const settings = data.settings || {};
  const pricePerPack = Number(settings.pricePerPack || 0);
  const cigsPerPack  = Number(settings.cigsPerPack || 20);

  // total clopes
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
  // Valeur par défaut: maintenant (corrigé timezone) au format "YYYY-MM-DDTHH:mm"
  if ($agDate) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    $agDate.value = now.toISOString().slice(0, 16);
  }

  if ($agAdd) $agAdd.addEventListener('click', onAgendaAdd);
}

function onAgendaAdd() {
  const isoLocal = $agDate?.value;      // "YYYY-MM-DDTHH:mm"
  const cigs     = Number($agCigs?.value || 0);

  if (!isoLocal || !cigs) {
    showFeedback('Renseigne la date/heure et la quantité.', 'error');
    return;
  }
  // Convertit en ISO UTC propre
  const date = new Date(isoLocal);

  const data = getData();
  data.entries.push({ date: date.toISOString(), cigarettes: cigs });
  data.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
  setData(data);

  if ($agCigs) $agCigs.value = '';
  renderAgenda();
  renderEconomies();
  showFeedback('Ajout enregistré.', 'ok');
}

function renderAgenda() {
  if (!$agList) return;

  const data = getData();
  const byDay = {};
  for (const e of (data.entries || [])) {
    const d = new Date(e.date);
    const day = d.toISOString().slice(0, 10); // YYYY-MM-DD
    (byDay[day] ||= []).push(e);
  }

  const days = Object.keys(byDay).sort().reverse().slice(0, 30); // 30 derniers jours
  let html = '';
  for (const day of days) {
    const total = byDay[day].reduce((s, e) => s + Number(e.cigarettes || 0), 0);
    html += `<li class="day">${day} — ${total} clopes</li>`;
    for (const e of byDay[day]) {
      const t = new Date(e.date).toISOString().slice(11, 16); // HH:mm
      html += `<li>${t} · ${e.cigarettes}</li>`;
    }
  }
  $agList.innerHTML = html || '<li>Aucune donnée</li>';
}

// ====== Boot ======
document.addEventListener('DOMContentLoaded', () => {
  initAgenda();
  renderAgenda();
  renderEconomies();
});
