import { initCounters }     from "./counters.js";
import { initSettings }     from "./settings.js";
import { initImportExport } from "./export.js";
import { initStatsHeader }  from "./stats.js";
import { initChart }        from "./chart.js";

document.addEventListener("DOMContentLoaded", () => {
  initCounters();
  initSettings();
  initImportExport();
  initStatsHeader();
  initChart();
});
