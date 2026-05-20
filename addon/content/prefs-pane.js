// Preferences pane controller for the Journal Code plugin.
//
// Wiring strategy: at script-eval time (inside Zotero's _loadPane →
// Cu.Sandbox), the pane markup has not yet been appended to the document.
// Zotero's loader dispatches a `load` Event on each direct child of the pane
// container after markup insertion and pre-processing (see Zotero's
// preferences.js _initImportedNodesPostInsert). We register a capture listener
// on `document` for that event and key off the root element's id.

/* global Zotero, Components, document, window */

const PREF = "extensions.zotero.jcode.tsvPath";
const ROOT_ID = "zotero-prefpane-jcode";

function log(msg) {
  try { Zotero.debug(`[jcode-prefs] ${msg}`); } catch (_) {}
}

function wire(root) {
  const input = root.querySelector("#jcode-tsv-path");
  const browse = root.querySelector("#jcode-tsv-browse");
  const reset = root.querySelector("#jcode-tsv-reset");
  if (!input || !browse || !reset) {
    log(
      `wire: lookup failed input=${!!input} ` +
        `browse=${!!browse} reset=${!!reset}`,
    );
    return;
  }

  input.value = Zotero.Prefs.get(PREF, true) || "";
  input.addEventListener("change", () => {
    Zotero.Prefs.set(PREF, input.value, true);
  });

  browse.addEventListener("command", async () => {
    try {
      const Cc = Components.classes;
      const Ci = Components.interfaces;
      const fp = Cc["@mozilla.org/filepicker;1"]
        .createInstance(Ci.nsIFilePicker);
      // Gecko 100+ takes BrowsingContext here, not the window itself.
      fp.init(
        window.browsingContext,
        "Select journal table TSV",
        Ci.nsIFilePicker.modeOpen,
      );
      fp.appendFilter("TSV", "*.tsv");
      fp.appendFilters(Ci.nsIFilePicker.filterAll);
      const code = await new Promise((resolve) => fp.open(resolve));
      if (code === Ci.nsIFilePicker.returnOK
          || code === Ci.nsIFilePicker.returnReplace) {
        const path = fp.file.path;
        Zotero.Prefs.set(PREF, path, true);
        input.value = path;
      }
    } catch (err) {
      log(`browse: error: ${err}`);
    }
  });

  reset.addEventListener("command", () => {
    Zotero.Prefs.clear(PREF, true);
    input.value = "";
  });
}

document.addEventListener(
  "load",
  function onPaneLoad(event) {
    const target = event.target;
    if (!target || target.id !== ROOT_ID) return;
    document.removeEventListener("load", onPaneLoad, true);
    wire(target);
  },
  true,
);
