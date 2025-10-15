import { initCounters }     from "./counters.js";
import { initSettings }     from "./settings.js";
import { initImportExport } from "./export.js";
import { initStatsHeader }  from "./stats.js";
import { initChart }        from "./chart.js";
import { initAgenda }       from "./agenda.js";
import { initLimits }       from "./limits.js";

document.addEventListener("DOMContentLoaded", () => {
  initCounters();
  initSettings();
  initImportExport();
  initStatsHeader();
  initChart();
  initAgenda();
  initLimits();
});
