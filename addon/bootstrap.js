// Bootstrap entry point for the Journal Code plugin (Zotero 7+).
// Loaded by Zotero with `Zotero` and `Services` already in scope.
//
// At build time, build.sh prepends the contents of content/jcode-core.js
// and content/jcode.js (with `export` and the cross-file `import`
// stripped), so all of the following are top-level functions in this
// file's scope by the time install/startup/shutdown run:
//   - Pure: parseTsv, buildLookup, mergeJcodeIntoExtra, classifyItem,
//           buildSummaryMessage, shouldShowMenu
//   - Adapter: loadLookup, run, invalidateLookupCache
//
// Bundling avoids dynamic ESM `import()` from a `jar:` URI, which is
// brittle in Gecko (Zotero 9 / Gecko 140 silently rejects it).

/* global Zotero, Services, Components */
/* global parseTsv, buildLookup, mergeJcodeIntoExtra, classifyItem,
   buildSummaryMessage, shouldShowMenu,
   loadLookup, run, invalidateLookupCache */

const PLUGIN_ID = "jcode@zotero-jcode.local";
const MENUITEM_ID = "zotero-jcode-menuitem";
const KEY_ID = "zotero-jcode-key";
const ZOTERO_PANE_URI = "chrome://zotero/content/zoteroPane.xhtml";

let rootURIGlobal = null;
let prefObserverId = null;
let windowListener = null;
let chromeHandle = null;
const installedWindows = new Set();

function log(msg) {
  try {
    Zotero.debug(`[jcode] ${msg}`);
  } catch (_) {
    // Zotero might not be ready yet; ignore.
  }
}

function isZoteroWindow(window) {
  return window?.location?.href === ZOTERO_PANE_URI;
}

function installIntoWindow(window) {
  if (!isZoteroWindow(window)) {
    log(`installIntoWindow: skipping non-Zotero window (${window?.location?.href})`);
    return;
  }
  if (installedWindows.has(window)) {
    log("installIntoWindow: already installed in this window");
    return;
  }

  const doc = window.document;
  const itemMenu = doc.getElementById("zotero-itemmenu");
  if (!itemMenu) {
    log("installIntoWindow: #zotero-itemmenu not found; menu not added");
    return;
  }

  const menuitem = doc.createXULElement("menuitem");
  menuitem.id = MENUITEM_ID;
  menuitem.setAttribute("label", "Add Journal Code");
  menuitem.addEventListener("command", () => {
    log("menuitem: command fired");
    run(window, rootURIGlobal);
  });
  itemMenu.appendChild(menuitem);
  log("installIntoWindow: menu item appended");

  const popupHandler = () => {
    const count = window.ZoteroPane?.getSelectedItems?.().length ?? 0;
    menuitem.hidden = !shouldShowMenu(count);
  };
  itemMenu.addEventListener("popupshowing", popupHandler);

  const keyset = doc.getElementById("mainKeyset")
    || doc.querySelector("keyset")
    || doc.documentElement;
  let key = null;
  try {
    key = doc.createXULElement("key");
    key.id = KEY_ID;
    key.setAttribute("key", "J");
    key.setAttribute("modifiers", "accel,alt");
    key.addEventListener("command", () => {
      log("key: command fired");
      run(window, rootURIGlobal);
    });
    keyset.appendChild(key);
    log(`installIntoWindow: key appended to ${keyset.tagName}#${keyset.id || "(no id)"}`);
  } catch (err) {
    log(`installIntoWindow: failed to attach key: ${err}`);
    key = null;
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
    log(`uninstallFromWindow: cleanup failed: ${err}`);
  }
  delete window._jcodeCleanup;
  installedWindows.delete(window);
}

function forEachOpenZoteroWindow(fn) {
  const wins = Services.wm.getEnumerator(null);
  while (wins.hasMoreElements()) {
    const w = wins.getNext();
    if (isZoteroWindow(w)) fn(w);
  }
}

function attachWindowListener() {
  windowListener = {
    onOpenWindow(xulWindow) {
      const domWindow = xulWindow.docShell.domWindow;
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
      uninstallFromWindow(xulWindow.docShell.domWindow);
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

function registerChromePackage(rootURI) {
  // Register a chrome:// URI namespace pointing at the .xpi root, so
  // anything inside the package can be loaded via
  //   chrome://jcode/content/<path-relative-to-xpi-root>
  // This sidesteps Zotero 9's broken jar: URI fetcher (which returns
  // 500 for both data files and the prefs-pane XHTML when accessed
  // directly via rootURI + path).
  const aomStartup = Components.classes[
    "@mozilla.org/addons/addon-manager-startup;1"
  ].getService(Components.interfaces.amIAddonManagerStartup);
  const manifestURI = Services.io.newURI(
    "manifest.json",
    null,
    Services.io.newURI(rootURI),
  );
  chromeHandle = aomStartup.registerChrome(manifestURI, [
    ["content", "jcode", ""],
  ]);
}

function unregisterChromePackage() {
  if (chromeHandle) {
    try { chromeHandle.destruct(); } catch (_) {}
    chromeHandle = null;
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

async function registerPreferencePane(_rootURI) {
  await Zotero.PreferencePanes.register({
    pluginID: PLUGIN_ID,
    src: "chrome://jcode/content/content/prefs.xhtml",
    label: "Journal Code",
    scripts: ["chrome://jcode/content/content/prefs-pane.js"],
  });
}

function startPrefObserver() {
  prefObserverId = Zotero.Prefs.registerObserver(
    "jcode.tsvPath",
    () => invalidateLookupCache(),
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
  log(`startup: id=${id} version=${version} rootURI=${rootURI}`);
  rootURIGlobal = rootURI;
  try {
    registerChromePackage(rootURI);
    log("startup: chrome package registered");
  } catch (err) {
    log(`startup: registerChromePackage failed: ${err}`);
  }
  try {
    loadDefaultPrefs(rootURI);
    log("startup: default prefs loaded");
  } catch (err) {
    log(`startup: loadDefaultPrefs failed: ${err}`);
  }
  try {
    await registerPreferencePane(rootURI);
    log("startup: prefs pane registered");
  } catch (err) {
    log(`startup: registerPreferencePane failed: ${err}`);
  }
  try {
    startPrefObserver();
    log("startup: pref observer started");
  } catch (err) {
    log(`startup: startPrefObserver failed: ${err}`);
  }
  try {
    attachWindowListener();
    log("startup: window listener attached");
  } catch (err) {
    log(`startup: attachWindowListener failed: ${err}`);
  }
  try {
    forEachOpenZoteroWindow(installIntoWindow);
    log(`startup: scanned open windows; installed in ${installedWindows.size}`);
  } catch (err) {
    log(`startup: forEachOpenZoteroWindow failed: ${err}`);
  }
}

function shutdown(_data, _reason) {
  log("shutdown");
  detachWindowListener();
  stopPrefObserver();
  for (const w of [...installedWindows]) uninstallFromWindow(w);
  try {
    invalidateLookupCache();
  } catch (_) {}
  unregisterChromePackage();
  rootURIGlobal = null;
}
