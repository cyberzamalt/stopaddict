// web/js/economy.js
// -----------------------------------------------------------------------------
// Économie : calculs + préférence d'affichage persistante pour la série "Économies"
// -----------------------------------------------------------------------------
//
// Ce module expose :
//   - initEconomy()          : à appeler une seule fois (déjà fait dans app.js)
//   - isEconomyVisible()     : savoir si l'utilisateur veut voir la série économies
//   - setEconomyVisible(v)   : persister l'état
//   - computeEconomies(...)  : agréger les économies par jour à partir de l'historique
//
// Hypothèses légères sur les données :
//   history = [{ ts:Number(ms), type:"cigs"|"weed"|"alcohol", qty:Number, cost?:Number }]
//   settings = {
//     baseline: { cigsPerDay?, weedPerDay?, alcoholPerDay? },
//     prices:   { cigUnit?, weedUnit?, alcUnit? }
//   }
//
// Rien n'est imposé : tout est optionnel et géré en "best effort".
// -----------------------------------------------------------------------------

const ECON_VIS_KEY = "charts_show_economy_v1";

// --- Visibilité persistée de la série "Économies" ---
export function isEconomyVisible() {
  try { return localStorage.getItem(ECON_VIS_KEY) === "1"; }
  catch { return false; }
}
export function setEconomyVisible(v) {
  try { localStorage.setItem(ECON_VIS_KEY, v ? "1" : "0"); } catch {}
}

// --- Normalisation d'une date à minuit local ---
function startOfLocalDayTS(t) {
  const d = new Date(typeof t === "number" ? t : Date.now());
  d.setHours(0,0,0,0);
  return d.getTime();
}

// --- Calcul des économies par JOUR ---
// Règle simple : économie = max(0, baseline - réel) * prix_unitaire
export function computeEconomies(history, settings) {
  const baseC = Number(settings?.baseline?.cigsPerDay    ?? 0);
  const baseW = Number(settings?.baseline?.weedPerDay    ?? 0);
  const baseA = Number(settings?.baseline?.alcoholPerDay ?? 0);
  const pc    = Number(settings?.prices?.cigUnit  ?? 0);
  const pw    = Number(settings?.prices?.weedUnit ?? 0);
  const pa    = Number(settings?.prices?.alcUnit  ?? 0);

  if ((!baseC && !baseW && !baseA) || (!pc && !pw && !pa)) {
    return []; // rien à calculer proprement
  }

  const byDay = new Map(); // tsMinuit -> {c,w,a}
  for (const e of (history || [])) {
    const ts = Number(e?.ts ?? 0);
    if (!ts || !e?.type) continue;
    const key = startOfLocalDayTS(ts);
    if (!byDay.has(key)) byDay.set(key, { c:0, w:0, a:0 });
    const b = byDay.get(key);
    const q = Number(e.qty ?? 1);
    if (e.type === "cigs")    b.c += q;
    else if (e.type === "weed")    b.w += q;
    else if (e.type === "alcohol") b.a += q;
  }

  const out = [];
  for (const [day, real] of byDay) {
    const ecoC = Math.max(0, baseC - real.c) * pc;
    const ecoW = Math.max(0, baseW - real.w) * pw;
    const ecoA = Math.max(0, baseA - real.a) * pa;
    const saving = Number((ecoC + ecoW + ecoA).toFixed(2));
    if (saving > 0) out.push({ ts: day, saving });
  }
  // tri par date croissante
  out.sort((a,b)=>a.ts-b.ts);
  return out;
}

// --- Optionnel : petit utilitaire global pour d'autres modules ---
export function initEconomy() {
  // Rien d'obligatoire ici, mais on expose une API minimale côté window si besoin.
  try {
    window.SA = window.SA || {};
    window.SA.economy = {
      isVisible: isEconomyVisible,
      setVisible: setEconomyVisible,
      compute: computeEconomies
    };
  } catch {}
}
