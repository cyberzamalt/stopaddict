// web/js/export.js
import { state, save, resetAll } from "./state.js";
import { t } from "./i18n.js";

const btnImport   = document.getElementById("btnImport");
const fileJson    = document.getElementById("fileJson");
const btnExport   = document.getElementById("btnExport");
const btnExportJs = document.getElementById("btnExportJson");
const btnClearAll = document.getElementById("btnClearAll");
const feedback    = document.getElementById("feedback");
const preview     = document.getElementById("preview");

function flash(msgKey, kind="info") {
  feedback.className = "feedback " + kind;
  feedback.textContent = t(msgKey);
  setTimeout(()=>{ feedback.className = "feedback"; feedback.textContent = ""; }, 3000);
}

function download(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function initImportExport(){
  if (btnImport) {
    btnImport.onclick = () => fileJson.click();
  }

  if (fileJson) {
    fileJson.onchange = async () => {
      const f = fileJson.files?.[0];
      if (!f) return;
      try {
        const text = await f.text();
        const json = JSON.parse(text);
        // structure attendue: {settings?, entries?}
        if (json.settings) {
          state.settings = { ...state.settings, ...json.settings };
        }
        if (Array.isArray(json.entries)) {
          state.entries = json.entries;
        }
        save(state);

        preview.hidden = false;
        preview.textContent = JSON.stringify(json, null, 2);

        document.dispatchEvent(new CustomEvent("sa:imported"));
        flash("msg.import.ok", "ok");
      } catch {
        flash("msg.import.err", "error");
      } finally {
        fileJson.value = "";
      }
    };
  }

  if (btnExport) {
    btnExport.onclick = () => {
      const rows = [["ts","type","qty"]];
      for (const e of state.entries) rows.push([e.ts, e.type, e.qty ?? 1]);
      const csv = rows.map(r => r.join(",")).join("\n");
      download("stopaddict_export.csv", "text/csv;charset=utf-8", csv);
      flash("msg.export.csv.ok", "ok");
    };
  }

  if (btnExportJs) {
    btnExportJs.onclick = () => {
      const data = JSON.stringify(state, null, 2);
      download("stopaddict_export.json", "application/json;charset=utf-8", data);
      flash("msg.export.json.ok", "ok");
    };
  }

  if (btnClearAll) {
    btnClearAll.onclick = () => {
      // confirmation simple
      const ok = confirm(t("msg.clear.confirm"));
      if (!ok) return;
      resetAll();
      preview.hidden = true;
      preview.textContent = "";
      document.dispatchEvent(new CustomEvent("sa:changed"));
      flash("msg.clear.ok", "ok");
    };
  }
}
