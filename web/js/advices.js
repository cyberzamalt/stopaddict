/* ============================================================
   StopAddict v3 — advices.js
   Conseils dynamiques contextuels (personnalisés & multi-langues)
   ============================================================ */
(function () {
  "use strict";

  const panel = document.getElementById("advice-panel");
  if (!panel) return;

  let advices = [];
  let timer = null;

  /* ---------- Chargement JSON multi-langue ---------- */
  async function loadAdvices(lang = "fr") {
    const path = `./i18n/advices_${lang}.json`;
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      advices = data;
      console.info(`[advices] Fichier chargé : ${path}`);
    } catch (e) {
      console.warn(`[advices] Échec chargement (${path}), fallback en français.`, e);
      if (lang !== "fr") await loadAdvices("fr");
    }
  }

  /* ---------- Sélection de conseil ---------- */
  function pickAdvice(S) {
    const now = new Date();
    const dayData = S.today;
    const total = dayData.counters.cigs + dayData.counters.joints + dayData.counters.alcohol;

    // --- Cas particuliers selon contexte ---
    // 1. Jour d’arrêt
    if (S.habits.stopDate && isToday(S.habits.stopDate)) {
      return pickFromCategory("stop_day", S);
    }

    // 2. Habitudes + prix -> économies
    const hasPrices = Object.values(S.prices).some(v => v > 0);
    const hasHabits = Object.values(S.habits.goal).some(v => v);
    if (hasPrices && hasHabits) {
      return pickFromCategory("economy", S);
    }

    // 3. Streak (nombre de jours depuis arrêt)
    if (S.habits.stopDate) {
      const diff = daysSince(S.habits.stopDate);
      if ([1, 7, 30].includes(diff)) {
        return pickFromCategory(`milestone_${diff}`, S);
      }
    }

    // 4. Si aucune condition spéciale
    return pickFromCategory("motivation", S);
  }

  function pickFromCategory(cat, S) {
    const lang = S.profile.lang || "fr";
    const pool = (advices.find(a => a.category === cat)?.messages) || [];
    if (pool.length === 0) return fallbackAdvice(cat, lang, S);
    const text = pool[Math.floor(Math.random() * pool.length)];
    return personalize(text, S);
  }

  function fallbackAdvice(cat, lang, S) {
    const t = {
      fr: {
        stop_day: "C'est ton grand jour d'arrêt, bravo pour ce pas vers la liberté !",
        economy: "Pense à ce que tu économises à chaque cigarette non fumée 💰",
        motivation: "Chaque petite victoire compte. Continue !",
        milestone_1: "1 jour sans consommer ! Le premier pas est fait !",
        milestone_7: "Une semaine ! Tu tiens bon 💪",
        milestone_30: "1 mois complet ! C’est déjà un vrai changement 👏"
      },
      en: {
        stop_day: "It's your quit day — congrats on taking back your freedom!",
        economy: "Think of all the money you're saving 💰",
        motivation: "Every little victory matters. Keep going!",
        milestone_1: "1 day clean — first step done!",
        milestone_7: "A full week! You're doing great 💪",
        milestone_30: "30 days strong — this is transformation 👏"
      }
    };
    return personalize(t[lang]?.[cat] || t.fr.motivation, S);
  }

  /* ---------- Personnalisation du texte ---------- */
  function personalize(txt, S) {
    const name = S.profile.name || (S.profile.lang === "en" ? "friend" : "ami");
    const currency = S.profile.currency || "€";
    const lang = S.profile.lang || "fr";
    const saving = estimateSaving(S);
    return txt
      .replace(/\{name\}/g, name)
      .replace(/\{saving\}/g, saving.toFixed(2) + " " + currency)
      .replace(/\{lang\}/g, lang.toUpperCase());
  }

  /* ---------- Économie estimée ---------- */
  function estimateSaving(S) {
    const goals = S.habits.goal;
    const ref = (goals.cigs || 0) + (goals.joints || 0) + (goals.alcohol || 0);
    const act = (S.today.counters.cigs || 0) + (S.today.counters.joints || 0) + (S.today.counters.alcohol || 0);
    const diff = ref > 0 ? ref - act : 0;
    const avg = mean(Object.values(S.prices));
    return Math.max(0, diff * avg);
  }

  function mean(arr) {
    const vals = arr.filter(v => Number.isFinite(v));
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
  }

  /* ---------- Rotation automatique ---------- */
  function rotate(S) {
    clearInterval(timer);
    showAdvice(S);
    timer = setInterval(() => showAdvice(S), 20000);
  }

  function showAdvice(S) {
    if (!panel) return;
    const msg = pickAdvice(S);
    panel.textContent = msg;
  }

  /* ---------- Fonctions utilitaires ---------- */
  function daysSince(dateStr) {
    const d1 = new Date(dateStr);
    const d2 = new Date();
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  }

  function isToday(dateStr) {
    return new Date().toISOString().slice(0,10) === dateStr;
  }

  /* ---------- API publique ---------- */
  window.Advices = {
    refresh() {
      const S = window.S;
      if (!S) return;
      if (advices.length === 0) {
        loadAdvices(S.profile.lang).then(() => rotate(S));
      } else {
        rotate(S);
      }
    },
    showMilestone(days) {
      const lang = window.S?.profile.lang || "fr";
      const key = `milestone_${days}`;
      const pool = (advices.find(a => a.category === key)?.messages) || [];
      const txt = pool.length ? pool[Math.floor(Math.random()*pool.length)] : fallbackAdvice(key, lang, window.S);
      panel.textContent = personalize(txt, window.S);
    }
  };

  // Premier déclenchement au démarrage
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => window.Advices.refresh(), 1000);
  });

})();
