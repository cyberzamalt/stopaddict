// web/js/utils.js
export const DAY_MS = 86400000;

export function startOfDay(d = new Date()){
  const x = new Date(d); x.setHours(0,0,0,0); return x;
}
export function inRange(ts, a, b){
  const t = +new Date(ts); return t >= +a && t <= +b;
}
export function isToday(ts){
  const a = startOfDay(); const b = new Date(+a + DAY_MS - 1);
  return inRange(ts, a, b);
}

/* Accessibilité: envoie un message au lecteur d’écran */
export function announce(msg){
  let live = document.getElementById("aria-live");
  if(!live){
    live = document.createElement("div");
    live.id = "aria-live";
    live.className = "sr-only";
    live.setAttribute("aria-live","polite");
    document.body.appendChild(live);
  }
  live.textContent = ""; // force refresh
  setTimeout(()=>{ live.textContent = msg; }, 10);
}

/* Petit util: debounce */
export function debounce(fn, delay=150){
  let t; return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), delay); };
}

/* Récupère un nombre depuis un <input>, sinon défaut */
export function safeNumber(el, def=0){
  const n = +el.value; return Number.isFinite(n) ? n : def;
}
