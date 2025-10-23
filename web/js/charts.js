import { getTotalsForRange, on, emit } from "./state.js";

console.log("[charts.js] Module loaded");

let currentRange = "day";
let chartMain = null;
let chartEco = null;
const canvases = { main: null, eco: null };

function setupCanvases() {
  canvases.main = document.getElementById("chart-consommations");
  canvases.eco = document.getElementById("chart-cout-eco");
  return !!canvases.main;
}

function labelsForRange(range) {
  if (range === "day") return ["Matin", "Midi", "Soir", "Nuit"];
  if (range === "week") return ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  if (range === "month") return ["S1","S2","S3","S4"];
  if (range === "year") return ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"];
  return ["A","B","C"];
}

function computeYMax(values) {
  const max = Math.max(...values);
  return Math.ceil(max + 1);
}

function render(range="day") {
  const totals = getTotalsForRange(range);
  if (typeof window.Chart === "undefined") {
    emit("charts:totals", { range, totals });
    return;
  }

  const labels = labelsForRange(range);
  const dataVals = [totals.cigs, totals.weed, totals.alcohol];
  const yMax = computeYMax(dataVals);

  // Destroy previous
  if (chartMain) try { chartMain.destroy(); } catch {}
  if (chartEco) try { chartEco.destroy(); } catch {}

  const ctx = canvases.main.getContext("2d");
  chartMain = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Cigarettes","Joints","Alcool"],
      datasets: [{label:`Consommations (${range})`,data:dataVals,
        backgroundColor:["#f87171","#34d399","#60a5fa"],borderWidth:1}]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      scales:{y:{beginAtZero:true,max:yMax}}
    }
  });

  if (canvases.eco) {
    const ctx2 = canvases.eco.getContext("2d");
    chartEco = new Chart(ctx2, {
      type: "line",
      data: {
        labels,
        datasets:[{label:"Coût/Économie",data:Array(labels.length).fill(0),
          borderColor:"#38bdf8",backgroundColor:"rgba(56,189,248,0.15)",tension:0.2}]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        scales:{y:{beginAtZero:true,max:5}}
      }
    });
  }

  emit("charts:totals", { range, totals });
}

function setupRangeButtons() {
  const container = document.getElementById("chartRange");
  if (!container) return;
  const buttons = Array.from(container.querySelectorAll(".btn.pill"));
  buttons.forEach(b => {
    b.addEventListener("click", () => {
      buttons.forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      currentRange = b.dataset.range;
      render(currentRange);
    });
  });
}

export function initCharts() {
  if (!setupCanvases()) return;
  setupRangeButtons();
  on("sa:counts-updated", () => render(currentRange));
  on("sa:route-changed", e=>{
    if (e.detail?.screen==="ecran-stats") render(currentRange);
  });
  render(currentRange);
  console.log("[charts.initCharts] ✓ Ready");
}
