const ACCENT = {
  "theme-space": "#69549a",
  "theme-forest": "#38654b",
  "theme-sea": "#306779",
  "theme-candy": "#366e64",
  "theme-night": "#505f91",
  "bg-dawn": "#995938",
  "bg-meadow": "#576c37",
  "bg-ink": "#805381",
};

let savedItems = [];
let equippedId = null;
let trial = null;
let timer = null;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn(trial));
}

export function subscribeTrial(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function currentTrial() {
  return trial;
}

function equippedTheme() {
  return savedItems.find((item) => item.equipped && item.type === "theme") || null;
}

function equippedBackground() {
  return savedItems.find((item) => item.equipped && item.type === "background") || null;
}

function colorItem() {
  if (trial?.type === "theme") return trial;
  const theme = equippedTheme();
  if (theme) return theme;
  if (trial?.type === "background") return trial;
  return equippedBackground();
}

export function activePhotoId() {
  if (trial?.type === "background" || trial?.type === "theme") return trial.id;
  const background = equippedBackground();
  if (background) return background.id;
  return equippedTheme()?.id || null;
}

function paint(preview, id) {
  const root = document.documentElement;
  [...document.body.classList].forEach((name) => {
    if (name.startsWith("theme-") || Object.hasOwn(ACCENT, name)) {
      document.body.classList.remove(name);
    }
  });
  if (!id) {
    delete root.dataset.boardTheme;
    for (const key of ["cell", "ink", "line", "room", "accent"]) root.style.removeProperty(`--${key}`);
    return;
  }
  root.dataset.boardTheme = id;
  document.body.classList.add(id, "theme-light");
  const colors = preview || {};
  for (const key of ["cell", "ink", "line", "room"]) {
    if (colors[key]) root.style.setProperty(`--${key}`, colors[key]);
    else root.style.removeProperty(`--${key}`);
  }
  root.style.setProperty("--accent", ACCENT[id] || "#2461f7");
}

function paintSaved() {
  const source = colorItem();
  equippedId = activePhotoId();
  paint(source?.preview || null, source?.id || null);
  emit();
}

export function rememberEquipped(items) {
  savedItems = items || [];
  if (!trial) paintSaved();
}

export function startTrial(item) {
  clearTimeout(timer);
  trial = item;
  paintSaved();
  timer = setTimeout(() => clearTrial(), 60000);
}

export function clearTrial() {
  clearTimeout(timer);
  timer = null;
  trial = null;
  paintSaved();
  emit();
}

export function trialKeeps(pathname) {
  return pathname === "/" || pathname === "/dukkan" || pathname === "/games" || /^\/games\/[^/]+$/.test(pathname);
}
