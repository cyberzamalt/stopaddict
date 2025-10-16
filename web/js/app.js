import { initCounters }     from "./counters.js";
import { initSettings }     from "./settings.js";
import { initImportExport } from "./export.js";
import { initStatsHeader }  from "./stats.js";
import { initLimits }       from "./limits.js";
import { initCharts }       from "./charts.js";
import { initCalendar }     from "./calendar.js";

document.addEventListener("DOMContentLoaded", () => {
  initCounters();
  initSettings();
  initImportExport();
  initStatsHeader();
  initLimits();
  initCharts();
  initCalendar();
});
