import { $, toast } from "./utils.js";
import { state } from "./state.js";

export function initImportExport() {
  const btnImport = $("#btnImport");
  const fileJson  = $("#fileJson");
  const btnExport = $("#btnExport");
  const preview   = $("#preview");
  const feedback  = $("#feedback");

  btnImport.onclick = () => fileJson.click();

  fileJson.onchange = async () => {
    const f = fileJson.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      if (json.settings) state.settings = { ...state.settings, ...json.settings };
      if (Array.isArray(json.entries)) state.entries = json.entries;
      localStorage.setItem("sa:data", JSON.stringify(state));
      preview.hidden = false;
      preview.textContent = JSON.stringify(json, null, 2);
      toast(feedback, "Import réussi. Données enregistrées.", "ok");
      document.dispatchEvent(new Event("sa:imported"));
      document.dispatchEvent(new Event("sa:changed"));
    } catch {
      toast(feedback, "Import invalide.", "error");
    } finally {
      fileJson.value = "";
    }
  };

  btnExport.onclick = () => {
    const rows = [["ts","type","qty"]];
    for (const e of state.entries) rows.push([e.ts, e.type, e.qty ?? 1]);
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stopaddict_export.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast(feedback, "Export CSV généré.", "ok");
  };
}
