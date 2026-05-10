// Preferences pane controller for the Journal Code plugin.
// Loaded as an external script from prefs.xhtml — keeping it separate
// avoids the inline-script CSP that chrome:// pages enforce.

/* global Zotero, Components, document, window */

(function () {
  const PREF = "extensions.zotero.jcode.tsvPath";

  function log(msg) {
    try { Zotero.debug(`[jcode-prefs] ${msg}`); } catch (_) {}
  }
  log("script loaded");

  const input = document.getElementById("jcode-tsv-path");
  const browse = document.getElementById("jcode-tsv-browse");
  const reset = document.getElementById("jcode-tsv-reset");
  if (!input || !browse || !reset) {
    log(`element lookup failed: input=${!!input} browse=${!!browse} reset=${!!reset}`);
    return;
  }

  // Manual two-way binding rather than the `preference` attribute, which
  // is a Z6-era idiom Zotero 7+ no longer auto-processes.
  input.value = Zotero.Prefs.get(PREF, true) || "";
  input.addEventListener("change", () => {
    Zotero.Prefs.set(PREF, input.value, true);
    log(`pref set to ${input.value || "(empty)"}`);
  });

  browse.addEventListener("click", async () => {
    log("browse clicked");
    const Cc = Components.classes;
    const Ci = Components.interfaces;
    const fp = Cc["@mozilla.org/filepicker;1"]
      .createInstance(Ci.nsIFilePicker);
    fp.init(window, "Select journal table TSV", Ci.nsIFilePicker.modeOpen);
    fp.appendFilter("TSV", "*.tsv");
    fp.appendFilters(Ci.nsIFilePicker.filterAll);
    const code = await new Promise((resolve) => fp.open(resolve));
    if (code === Ci.nsIFilePicker.returnOK
        || code === Ci.nsIFilePicker.returnReplace) {
      const path = fp.file.path;
      Zotero.Prefs.set(PREF, path, true);
      input.value = path;
      log(`pref set via picker: ${path}`);
    }
  });

  reset.addEventListener("click", () => {
    Zotero.Prefs.clear(PREF, true);
    input.value = "";
    log("pref cleared");
  });

  log("controller wired");
})();
