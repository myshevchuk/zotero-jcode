// Bootstrap entry point for the Journal Code plugin (Zotero 7+).
// Loaded by Zotero with `Zotero` and `Services` already in scope.
//
// Responsibilities (kept thin per the design's pure/glue split):
//   - install/startup/shutdown/uninstall lifecycle hooks
//   - dynamic-import the ESM adapter (content/jcode.js) once at startup
//   - register the preferences pane
//   - listen for new Zotero windows; install / uninstall the menu item and
//     keyboard shortcut into each one
//   - on shutdown, remove every UI element we added so disable+enable
//     leaves no duplicates (spec req 10)

/* global Zotero, Services, ChromeUtils */

const PLUGIN_ID = "jcode@zotero-jcode.local";
const MENUITEM_ID = "zotero-jcode-menuitem";
const KEY_ID = "zotero-jcode-key";
const ZOTERO_PANE_URI = "chrome://zotero/content/zoteroPane.xhtml";

let adapter = null;
let rootURIGlobal = null;
let prefObserverId = null;
let windowListener = null;
const installedWindows = new Set();

function isZoteroWindow(window) {
  return window.location?.href === ZOTERO_PANE_URI;
}

function installIntoWindow(window) {
  if (!isZoteroWindow(window) || installedWindows.has(window)) return;

  const doc = window.document;
  const itemMenu = doc.getElementById("zotero-itemmenu");
  if (!itemMenu) return;

  const menuitem = doc.createXULElement("menuitem");
  menuitem.id = MENUITEM_ID;
  menuitem.setAttribute("label", "Add Journal Code");
  menuitem.addEventListener("command", () => adapter.run(window, rootURIGlobal));
  itemMenu.appendChild(menuitem);

  const popupHandler = () => {
    const count = window.ZoteroPane.getSelectedItems().length;
    menuitem.hidden = !adapter.shouldShowMenu(count);
  };
  itemMenu.addEventListener("popupshowing", popupHandler);

  const keyset = doc.getElementById("mainKeyset") || doc.querySelector("keyset");
  let key = null;
  if (keyset) {
    key = doc.createXULElement("key");
    key.id = KEY_ID;
    key.setAttribute("key", "J");
    key.setAttribute("modifiers", "accel,alt");
    key.addEventListener("command", () => adapter.run(window, rootURIGlobal));
    keyset.appendChild(key);
  }

  installedWindows.add(window);
  window._jcodeCleanup = () => {
    itemMenu.removeEventListener("popupshowing", popupHandler);
    menuitem.remove();
    if (key) key.remove();
  };
}

function uninstallFromWindow(window) {
  if (!installedWindows.has(window)) return;
  try {
    window._jcodeCleanup?.();
  } catch (err) {
    Zotero?.debug?.(`[jcode] cleanup failed: ${err}`);
  }
  delete window._jcodeCleanup;
  installedWindows.delete(window);
}

function forEachOpenZoteroWindow(fn) {
  const wins = Services.wm.getEnumerator("navigator:browser");
  while (wins.hasMoreElements()) {
    const w = wins.getNext();
    if (isZoteroWindow(w)) fn(w);
  }
}

function attachWindowListener() {
  windowListener = {
    onOpenWindow(xulWindow) {
      const domWindow = xulWindow
        .docShell.domWindow;
      domWindow.addEventListener(
        "load",
        function onLoad() {
          domWindow.removeEventListener("load", onLoad);
          installIntoWindow(domWindow);
        },
        { once: true },
      );
    },
    onCloseWindow(xulWindow) {
      const domWindow = xulWindow.docShell.domWindow;
      uninstallFromWindow(domWindow);
    },
  };
  Services.wm.addListener(windowListener);
}

function detachWindowListener() {
  if (windowListener) {
    Services.wm.removeListener(windowListener);
    windowListener = null;
  }
}

function loadDefaultPrefs(rootURI) {
  Services.scriptloader.loadSubScript(`${rootURI}prefs.js`, {
    pref: (name, value) => {
      if (Zotero.Prefs.get(name, true) === undefined) {
        Zotero.Prefs.set(name, value, true);
      }
    },
  });
}

async function registerPreferencePane(rootURI) {
  await Zotero.PreferencePanes.register({
    pluginID: PLUGIN_ID,
    src: `${rootURI}content/prefs.xhtml`,
    label: "Journal Code",
  });
}

function startPrefObserver() {
  prefObserverId = Zotero.Prefs.registerObserver(
    "jcode.tsvPath",
    () => adapter.invalidateLookupCache(),
    true,
  );
}

function stopPrefObserver() {
  if (prefObserverId !== null) {
    Zotero.Prefs.unregisterObserver(prefObserverId);
    prefObserverId = null;
  }
}

// Lifecycle ------------------------------------------------------------------

function install(_data, _reason) {}
function uninstall(_data, _reason) {}

async function startup({ id, version, rootURI }, _reason) {
  rootURIGlobal = rootURI;
  loadDefaultPrefs(rootURI);
  adapter = await import(`${rootURI}content/jcode.js`);
  await registerPreferencePane(rootURI);
  startPrefObserver();
  attachWindowListener();
  forEachOpenZoteroWindow(installIntoWindow);
}

function shutdown(_data, _reason) {
  detachWindowListener();
  stopPrefObserver();
  for (const w of [...installedWindows]) uninstallFromWindow(w);
  if (adapter?.invalidateLookupCache) adapter.invalidateLookupCache();
  adapter = null;
  rootURIGlobal = null;
}
