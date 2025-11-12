/* ============================================================
   StopAddict — advices.js  (v3, one-shot)
   Rôle : messages de conseils personnalisés selon :
           - prénom (si fourni)
           - langue choisie (fr / en)
           - état : en réduction, en maintien, en arrêt
           - rotation automatique toutes les 20 s
   API   : StopAddictAdvices.init({ S })
           StopAddictAdvices.refresh({ S })
   ============================================================ */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const ADVICE_DELAY = 20000; // ms entre chaque rotation
  let timer = null;
  let index = 0;

  // ====== Bibliothèque multilingue de conseils ======
  const advicesLib = {
    fr: {
      reduction: [
        "Chaque clope évitée est déjà une victoire, {{name}} !",
        "Rappelle-toi pourquoi tu as commencé : la santé, la liberté, la fierté.",
        "Un pas à la fois suffit pour changer ta vie.",
        "Garde le cap ! Le changement durable se construit jour après jour."
      ],
      maintien: [
        "Ta constance paie, {{name}}. Continue sur cette lancée !",
        "Tu deviens un exemple pour ceux qui t’entourent.",
        "Ton corps te remercie déjà !",
        "Chaque jour sans excès renforce ton équilibre."
      ],
      arret: [
        "Bravo {{name}} ! Ton arrêt marque un vrai tournant.",
        "Respire profondément : c’est la liberté.",
        "Tu viens de gagner une journée de plus sans dépendance.",
        "Souviens-toi du chemin parcouru et célèbre-le !"
      ]
    },
    en: {
      reduction: [
        "Every skipped cigarette is a small victory, {{name}}!",
        "Remember why you started: health, freedom, pride.",
        "Step by step, change becomes real.",
        "Keep going – sustainable change builds day by day."
      ],
      maintien: [
        "Consistency pays off, {{name}}!",
        "You’re becoming an inspiration to others.",
        "Your body already thanks you.",
        "Every balanced day strengthens your new habits."
      ],
      arret: [
        "Congrats {{name}} – that’s real freedom!",
        "Breathe deeply: you’ve reclaimed your control.",
        "Another day free from addiction!",
        "Celebrate the journey you’ve completed."
      ]
    }
  };

  // ====== Déterminer état utilisateur ======
  function getUserState(S) {
    const stopDate = S.habits?.stopDate || null;
    const today = (window.StopAddictState && StopAddictState.todayLocalISO())
      ? StopAddictState.todayLocalISO()
      : new Date().toISOString().slice(0, 10);

    const counters = S.today?.counters || {};
    const total = (counters.cigs || 0) + (counters.weed || 0) + (counters.alcohol || 0) +
                  (counters.beer || 0) + (counters.hard || 0) + (counters.liqueur || 0);

    if (stopDate && today >= stopDate && total === 0) return "arret";
    if (total > 0 && total < 5) return "maintien";
    return "reduction";
  }

  // ====== Sélection d’un conseil ======
  function pickAdvice(S) {
    const lang = (S.profile?.lang || "fr") in advicesLib ? S.profile.lang : "fr";
    const state = getUserState(S);
    const list = advicesLib[lang][state] || advicesLib.fr.reduction;
    if (!list.length) return "";
    const msg = list[index % list.length];
    index++;
    const name = (S.profile?.name || "").trim() || (lang === "fr" ? "toi" : "you");
    return msg.replace("{{name}}", name);
  }

  // ====== Affichage ======
  function showAdvice(S) {
    let panel = document.getElementById("advice-panel");
    if (!panel) {
      // création si absent (footer léger)
      panel = document.createElement("div");
      panel.id = "advice-panel";
      panel.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #0b1220;
        color: #fff;
        padding: .6rem 1rem;
        text-align: center;
        font-size: .95rem;
        z-index: 9999;
        box-shadow: 0 -2px 6px rgba(0,0,0,0.25);
      `;
      document.body.appendChild(panel);
    }

    const msg = pickAdvice(S);
    panel.textContent = msg || "";
  }

  // ====== Rotation automatique ======
  function startRotation(S) {
    clearInterval(timer);
    showAdvice(S);
    timer = setInterval(() => showAdvice(S), ADVICE_DELAY);
  }

  // ====== API publique ======
  const AdvicesAPI = {
    init(ctx) {
      const S = ctx?.S || window.S;
      if (!S) return;
      startRotation(S);
    },
    refresh(ctx) {
      const S = ctx?.S || window.S;
      if (!S) return;
      startRotation(S);
    }
  };

  // ====== Expose ======
  window.StopAddictAdvices = AdvicesAPI;
})();
