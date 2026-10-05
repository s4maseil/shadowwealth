/* ████████████████████████████████████████████████████████████████████████████
 * ██                                                                        ██
 * ██        🔥🔥🔥   HIER DEINE FIREBASE CONFIG EINFÜGEN   🔥🔥🔥             ██
 * ██                                                                        ██
 * ████████████████████████████████████████████████████████████████████████████
 *
 *  ✅ Eingetragen: Firebase-Projekt „shadowwealth-b8ad1“.
 *  Quelle: Firebase Console → Projekteinstellungen → Allgemein → „Meine Apps“ → Config.
 *  Stehen hier Platzhalter (HIER_…), startet die App im lokalen DEMO-MODUS.
 */
const firebaseConfig = {
  apiKey: "AIzaSyB61_T7zgvBZ8Qe_iUqOwNjjpuL7rDMo1E",
  authDomain: "shadowwealth-b8ad1.firebaseapp.com",
  projectId: "shadowwealth-b8ad1",
  storageBucket: "shadowwealth-b8ad1.firebasestorage.app",
  messagingSenderId: "890529980976",
  appId: "1:890529980976:web:99d183dad8bdefc33743f5",
};

/* Name eures Haushalts in Firestore – muss zu den Sicherheitsregeln passen.
   Struktur: households/{HOUSEHOLD_ID}              → Einstellungen
             households/{HOUSEHOLD_ID}/entries/{id} → Einträge                */
const HOUSEHOLD_ID = "unser-haushalt";

/* ████████████████████████████  ENDE FIREBASE CONFIG  ████████████████████████ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy,
  setDoc, // zusätzlich: Einstellungen speichern & gelöschte Einträge wiederherstellen
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";


/* ═══════════════════════════════════════════════════════════════════════════
   1 · APP-KONFIGURATION (frei anpassbar)
   ═══════════════════════════════════════════════════════════════════════════ */

/* Namen der beiden Personen (in der App unter „Einstellungen“ änderbar) */
const DEFAULT_NAMES = { A: "Matze", B: "Pia" };

const CATEGORIES = {
  mobilitaet: { label: "Mobilität",              icon: "fa-train",          color: "#059669" },
  wohnen:     { label: "Wohnen & Energie",       icon: "fa-house",          color: "#0f766e" },
  familie:    { label: "Kinder & Familie",       icon: "fa-baby-carriage",  color: "#34d399" },
  essen:      { label: "Essen & Trinken",        icon: "fa-utensils",       color: "#65a30d" },
  gesundheit: { label: "Pflege & Gesundheit",    icon: "fa-heart-pulse",    color: "#14b8a6" },
  medien:     { label: "Kommunikation & Medien", icon: "fa-wifi",           color: "#0891b2" },
  freizeit:   { label: "Freizeit & Urlaub",      icon: "fa-umbrella-beach", color: "#0ea5e9" },
  finanzen:   { label: "Finanzen & Gebühren",    icon: "fa-landmark",       color: "#4A524D" },
  sonstiges:  { label: "Sonstiges",              icon: "fa-shapes",         color: "#A3ABA6" },
};

const QUICK_ACTIONS = [
  { id: "zug",      emoji: "🚆", title: "Zug pendeln",    amount: 70, category: "mobilitaet" },
  { id: "haare",    emoji: "✂️", title: "Haarschnitt",    amount: 25, category: "gesundheit" },
  { id: "kaffee",   emoji: "☕", title: "Kaffee",         amount: 3,  category: "essen" },
  { id: "mealprep", emoji: "🍱", title: "Kita Meal Prep", amount: 60, category: "familie" },
];

/* Laufende Einsparungen (€ pro Monat) – in der App unter „Einstellungen“ änderbar */
const DEFAULT_RECURRING = [
  { id: "zweitwagen", label: "Kein Zweitwagen",               amount: 300, category: "mobilitaet", icon: "fa-car" },
  { id: "miete",      label: "Miete unter Mietspiegel",       amount: 200, category: "wohnen",     icon: "fa-house" },
  { id: "kita",       label: "Kita-Zuschuss vom Arbeitgeber", amount: 100, category: "familie",    icon: "fa-school" },
  { id: "internet",   label: "Internet der Schwiegereltern",  amount: 40,  category: "medien",     icon: "fa-wifi" },
  { id: "streaming",  label: "Keine Streaming-Abos",          amount: 20,  category: "medien",     icon: "fa-tv" },
  { id: "handy",      label: "Nur Diensthandy",               amount: 45,  category: "medien",     icon: "fa-mobile-screen-button" },
  { id: "duschen",    label: "Kurz duschen",                  amount: 15,  category: "wohnen",     icon: "fa-shower" },
  { id: "windeln",    label: "Eigenmarken-Windeln",           amount: 15,  category: "familie",    icon: "fa-baby" },
  { id: "secondhand", label: "Second-Hand-Kinderkleidung",    amount: 100, category: "familie",    icon: "fa-shirt" },
  { id: "alkohol",    label: "Kein Alkohol & Tabak",          amount: 80,  category: "gesundheit", icon: "fa-ban-smoking" },
  { id: "neobroker",  label: "Neobroker statt Bankgebühren",  amount: 30,  category: "finanzen",   icon: "fa-chart-line" },
  { id: "urlaub",     label: "Günstigere Jahresurlaube",      amount: 250, category: "freizeit",   icon: "fa-umbrella-beach" },
];

/* Gamification-Konzept:
   • STUFEN messen Wirkung  → gesamtes Schattenvermögen (aktiv + laufend, netto)
   • ABZEICHEN belohnen Gewohnheiten → Routinen, Konsequenz, Teamwork
   • MONATSZIEL im Tracker → Fokus auf aktive Verzichte im laufenden Monat      */
const LEVELS = [
  { min: 0,      name: "Startklar",        icon: "fa-flag" },
  { min: 500,    name: "Kleingeld",        icon: "fa-coins" },
  { min: 2000,   name: "Polster",          icon: "fa-layer-group" },
  { min: 5000,   name: "Rücklage",         icon: "fa-piggy-bank" },
  { min: 10000,  name: "Fundament",        icon: "fa-building-columns" },
  { min: 25000,  name: "Schattenvermögen", icon: "fa-gem" },
  { min: 50000,  name: "Freiheitsfonds",   icon: "fa-dove" },
  { min: 100000, name: "Legende",          icon: "fa-crown" },
];

const BADGES = [
  { id: "first",    icon: "fa-seedling",       name: "Erster Schatten",        desc: "Den ersten bewussten Verzicht erfasst.",        target: 1,   value: s => s.count },
  { id: "habit",    icon: "fa-repeat",         name: "Gewohnheitstier",        desc: "50 Verzichte erfasst.",                         target: 50,  value: s => s.count },
  { id: "coffee",   icon: "fa-mug-hot",        name: "Barista zuhause",        desc: "20 Kaffees nicht gekauft.",                     target: 20,  value: s => s.quick.kaffee },
  { id: "commute",  icon: "fa-train",          name: "Pendel-Profi",           desc: "10-mal mit dem Zug gependelt.",                 target: 10,  value: s => s.quick.zug },
  { id: "mealprep", icon: "fa-utensils",       name: "Meal-Prep-Meister",      desc: "8-mal das Kita-Essen selbst vorbereitet.",      target: 8,   value: s => s.quick.mealprep },
  { id: "hair",     icon: "fa-scissors",       name: "Selbst ist der Schnitt", desc: "3 Friseurbesuche gespart.",                     target: 3,   value: s => s.quick.haare },
  { id: "allround", icon: "fa-shapes",         name: "Allrounder",             desc: "Verzichte in 5 verschiedenen Kategorien.",      target: 5,   value: s => s.categories },
  { id: "bigfish",  icon: "fa-fish",           name: "Dicker Fisch",           desc: "Ein einzelner Eintrag ab 100 €.",               target: 100, value: s => s.maxSingle, money: true },
  { id: "streak",   icon: "fa-fire",           name: "Dranbleiben",            desc: "4 Wochen in Folge mindestens ein Verzicht.",    target: 4,   value: s => s.streak },
  { id: "team",     icon: "fa-user-group",     name: "Teamwork",               desc: "4 Wochen, in denen ihr beide verzichtet habt.", target: 4,   value: s => s.teamWeeks },
  { id: "month500", icon: "fa-calendar-check", name: "Starker Monat",          desc: "500 € aktive Verzichte in einem Monat.",        target: 500, value: s => s.bestMonth, money: true },
  { id: "year",     icon: "fa-tree",           name: "Jahresringe",            desc: "In 12 verschiedenen Monaten verzichtet.",       target: 12,  value: s => s.monthsActive },
];

/* Manuelle Einträge zählen über diese Stichworte ebenfalls für die Quick-Action-Abzeichen */
const QUICK_MATCH = {
  zug: /\b(zug|bahn|pendel)/i,
  haare: /(haarschnitt|friseur|frisör|haare)/i,
  kaffee: /(kaffee|coffee|latte|cappuccino|espresso)/i,
  mealprep: /(meal.?prep|vorgekocht)/i,
};


/* ═══════════════════════════════════════════════════════════════════════════
   2 · KONSTANTEN
   ═══════════════════════════════════════════════════════════════════════════ */

const PERSONS = ["A", "B", "both"];
const LEGACY_NAMES = { A: "Person A", B: "Person B" }; // alte Standardnamen werden automatisch ersetzt
const PERSON_COLORS = { A: "#0E9F6E", B: "#0891b2", both: "#4A524D" };
const PERSON_DARK = { A: "#087A54", B: "#0E7490", both: "#1B201D" };
const CAT_KEYS = Object.keys(CATEGORIES);
const TABS = ["tracker", "dashboard", "history"];
const SOURCE_META = {
  recurring: { label: "Laufende Einsparungen", color: "#1B201D" },
  active:    { label: "Aktive Verzichte",      color: "#0E9F6E" },
};
const ITEM_PALETTE = ["#065F46", "#0E9F6E", "#3DBB86", "#7FD4AE", "#0f766e", "#14b8a6", "#0891b2", "#65a30d"];

const RANGES = [["month", "Monat"], ["3m", "3 Monate"], ["ytd", "Dieses Jahr"], ["12m", "12 Monate"], ["all", "Gesamt"], ["custom", "Eigener Zeitraum"]];
const SOURCES = [["all", "Alles"], ["active", "Nur aktiv"], ["recurring", "Nur laufend"]];
const VALUE_MODES = [["net", "Netto"], ["gross", "Brutto"]];
const CHART_TYPES = [["bar", "Balken"], ["area", "Fläche"]];
const INTERVALS = [["auto", "Auto"], ["day", "Tag"], ["week", "Woche"], ["month", "Monat"], ["year", "Jahr"]];
const SPLITS = [["source", "Quelle"], ["category", "Kategorie"], ["person", "Person"], ["none", "Summe"]];
const DONUT_DIMS = [["category", "Kategorie"], ["item", "Posten"], ["person", "Person"], ["source", "Quelle"]];
const VIEW_OPTIONS = { range: RANGES, source: SOURCES, value: VALUE_MODES, chartType: CHART_TYPES, interval: INTERVALS, split: SPLITS, donut: DONUT_DIMS };
const MAX_BUCKETS = 400;
const MAX_QTY = 50;
const QUICK_DATE_MEMORY_MS = 10 * 60 * 1000; // gewähltes Nachtrage-Datum 10 Minuten merken

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const MONTHS_SHORT = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const WEEKDAYS_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const DAY_MS = 864e5;
const REDUCED_MOTION = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;


/* ═══════════════════════════════════════════════════════════════════════════
   3 · HILFSFUNKTIONEN
   ═══════════════════════════════════════════════════════════════════════════ */

function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function sum(arr) { return arr.reduce((a, b) => a + b, 0); }
function round2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function pad(n) { return String(n).padStart(2, "0"); }

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function lsGet(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
  catch { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* z. B. privater Modus */ }
}

/* Zahlen & Geld (de-DE) */
const EUR_WHOLE = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const EUR_CENTS = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUM_FORMATS = {};
function numDe(v, digits = 1) {
  if (!NUM_FORMATS[digits]) NUM_FORMATS[digits] = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: digits });
  return NUM_FORMATS[digits].format(Number(v) || 0);
}
function money(v) {
  const r = round2(v) || 0; // verhindert „-0 €“
  return (Math.abs(r) >= 1000 || Number.isInteger(r) ? EUR_WHOLE : EUR_CENTS).format(r);
}
function moneyExact(v) { return EUR_CENTS.format(round2(v) || 0); }
function moneyCompact(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return `${numDe(v / 1e6, 1)} Mio. €`;
  if (a >= 1e4) return `${numDe(v / 1e3, 0)} Tsd. €`;
  if (a >= 1e3) return `${numDe(v / 1e3, 1)} Tsd. €`;
  return `${numDe(v, 0)} €`;
}
function parseAmount(input) {
  let s = String(input ?? "").trim().replace(/[€\s]/g, "");
  if (!s) return NaN;
  s = s.includes(",") && s.includes(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
function hexA(hex, alpha) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
function joinDe(list) {
  return list.length < 2 ? list.join("") : `${list.slice(0, -1).join(", ")} und ${list[list.length - 1]}`;
}
function initialOf(name) { return (Array.from(String(name).trim())[0] || "?").toUpperCase(); }

/* Datum: intern als Tageszahl (UTC-basiert, sommerzeitsicher) */
function localDateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function todayStr() { return localDateStr(new Date()); }
function toDn(s) { const [y, m, d] = String(s).split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAY_MS); }
function dnOf(y, m, d = 1) { return Math.round(Date.UTC(y, m - 1, d) / DAY_MS); }
function todayDn() { return toDn(todayStr()); }
function partsOf(n) {
  const d = new Date(n * DAY_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), wd: d.getUTCDay() };
}
function fromDn(n) { const p = partsOf(n); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; }
function isValidDateStr(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const n = toDn(s);
  return Number.isFinite(n) && fromDn(n) === s;
}
function mondayOf(n) { return n - ((partsOf(n).wd + 6) % 7); }
function fmtDate(n) { const p = partsOf(n); return `${pad(p.d)}.${pad(p.m)}.${p.y}`; }
function fmtDayShort(n) { const p = partsOf(n); return `${pad(p.d)}.${pad(p.m)}.`; }
function fmtDateLong(n) {
  const p = partsOf(n);
  return `${WEEKDAYS_LONG[p.wd]}, ${p.d}. ${MONTHS[p.m - 1]}${p.y === partsOf(todayDn()).y ? "" : ` ${p.y}`}`;
}
function relDayLabel(dateStr) {
  const diff = todayDn() - toDn(dateStr);
  if (diff === 0) return "heute";
  if (diff === 1) return "gestern";
  if (diff === 2) return "vorgestern";
  return `am ${fmtDateLong(toDn(dateStr))}`;
}
function isoWeek(n) {
  const d = new Date(n * DAY_MS);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3); // Donnerstag dieser Woche
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  firstThu.setUTCDate(firstThu.getUTCDate() - ((firstThu.getUTCDay() + 6) % 7) + 3);
  return 1 + Math.round((d - firstThu) / (7 * DAY_MS));
}

/* Laufende Beträge tagesgenau anteilig hochrechnen (monatlicher Betrag, inkl. Start- & Endtag) */
function accrue(monthly, from, to) {
  if (!(monthly > 0) || to < from) return 0;
  let total = 0;
  let cur = from;
  while (cur <= to) {
    const { y, m } = partsOf(cur);
    const monthStart = dnOf(y, m, 1);
    const monthEnd = dnOf(y, m + 1, 1) - 1;
    const segEnd = Math.min(monthEnd, to);
    total += monthly * (segEnd - cur + 1) / (monthEnd - monthStart + 1);
    cur = segEnd + 1;
  }
  return total;
}


/* ═══════════════════════════════════════════════════════════════════════════
   4 · DATENMODELL
   ═══════════════════════════════════════════════════════════════════════════ */

function cleanName(v, fallback) { return String(v ?? "").trim().slice(0, 24) || fallback; }
function pickName(raw, p) {
  const name = cleanName(raw, DEFAULT_NAMES[p]);
  return name === LEGACY_NAMES[p] ? DEFAULT_NAMES[p] : name;
}
function hasLegacyNames(raw) {
  return Boolean(raw?.names) && (raw.names.A === LEGACY_NAMES.A || raw.names.B === LEGACY_NAMES.B);
}
function clampQty(v) { return Math.min(999, Math.max(1, Math.round(Number(v) || 1))); }

function defaultSettings() {
  return {
    names: { ...DEFAULT_NAMES },
    grossFactor: 2,
    hourlyWage: 0,
    monthlyGoal: 300,
    trackingStart: `${new Date().getFullYear()}-01-01`,
    recurring: DEFAULT_RECURRING.map(r => ({ ...r, active: true, since: "" })),
  };
}

function normalizeSettings(raw) {
  const d = defaultSettings();
  if (!raw || typeof raw !== "object") return d;
  const num = (v, fb, min, max) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb; };
  return {
    names: { A: pickName(raw.names?.A, "A"), B: pickName(raw.names?.B, "B") },
    grossFactor: num(raw.grossFactor, 2, 1, 5),
    hourlyWage: num(raw.hourlyWage, 0, 0, 10000),
    monthlyGoal: num(raw.monthlyGoal, 300, 0, 1e6),
    trackingStart: isValidDateStr(raw.trackingStart) ? raw.trackingStart : d.trackingStart,
    recurring: Array.isArray(raw.recurring)
      ? raw.recurring.filter(r => r && r.id).map(r => {
          const category = CATEGORIES[r.category] ? r.category : "sonstiges";
          return {
            id: String(r.id).slice(0, 40),
            label: String(r.label || "Laufende Einsparung").slice(0, 60),
            amount: round2(num(r.amount, 0, 0, 1e6)),
            category,
            icon: typeof r.icon === "string" && /^fa-[a-z0-9-]+$/.test(r.icon) ? r.icon : CATEGORIES[category].icon,
            active: r.active !== false,
            since: isValidDateStr(r.since) ? r.since : "",
          };
        })
      : d.recurring,
  };
}

function serializeSettings(s) {
  return {
    names: { A: s.names.A, B: s.names.B },
    grossFactor: s.grossFactor,
    hourlyWage: s.hourlyWage,
    monthlyGoal: s.monthlyGoal,
    trackingStart: s.trackingStart,
    recurring: s.recurring.map(r => ({ id: r.id, label: r.label, amount: r.amount, category: r.category, icon: r.icon, active: r.active, since: r.since })),
    updatedAt: Date.now(),
  };
}

function normalizeEntry(raw) {
  const amount = round2(raw.amount);
  let date = isValidDateStr(raw.date) ? raw.date : "";
  if (!date) date = Number(raw.createdAt) ? localDateStr(new Date(Number(raw.createdAt))) : todayStr();
  return {
    id: String(raw.id),
    title: String(raw.title || "Ohne Titel").slice(0, 80),
    amount: amount > 0 ? amount : 0,
    qty: clampQty(raw.qty),
    category: CATEGORIES[raw.category] ? raw.category : "sonstiges",
    date,
    dn: toDn(date),
    person: PERSONS.includes(raw.person) ? raw.person : "both",
    quickId: typeof raw.quickId === "string" ? raw.quickId : null,
    createdAt: Number(raw.createdAt) || 0,
  };
}

function toStored(e) {
  return { title: e.title, amount: e.amount, qty: e.qty, category: e.category, date: e.date, person: e.person, quickId: e.quickId ?? null, createdAt: e.createdAt || Date.now() };
}

function byNewest(a, b) { return b.dn - a.dn || b.createdAt - a.createdAt; }


/* ═══════════════════════════════════════════════════════════════════════════
   5 · ZUSTAND
   ═══════════════════════════════════════════════════════════════════════════ */

const DEFAULT_VIEW = {
  range: "ytd", from: "", to: "", source: "all", cats: [...CAT_KEYS], persons: [...PERSONS],
  value: "net", chartType: "bar", interval: "auto", split: "source", cumulative: false, donut: "category",
};

function loadView() {
  const saved = lsGet("sw.view", null);
  const v = { ...DEFAULT_VIEW, cats: [...CAT_KEYS], persons: [...PERSONS] };
  if (saved && typeof saved === "object") {
    for (const [key, options] of Object.entries(VIEW_OPTIONS)) {
      if (options.some(([k]) => k === saved[key])) v[key] = saved[key];
    }
    if (isValidDateStr(saved.from)) v.from = saved.from;
    if (isValidDateStr(saved.to)) v.to = saved.to;
    if (Array.isArray(saved.cats)) v.cats = saved.cats.filter(c => CAT_KEYS.includes(c));
    if (Array.isArray(saved.persons)) v.persons = saved.persons.filter(p => PERSONS.includes(p));
    v.cumulative = saved.cumulative === true;
  }
  return v;
}

const savedPerson = lsGet("sw.person", "both");

const state = {
  mode: "local",
  entries: [],
  settings: normalizeSettings(null),
  entriesLoaded: false,
  settingsLoaded: false,
  defaultsWritten: false,
  namesMigrated: false,
  online: true,
  error: null,
  tab: null,
  person: PERSONS.includes(savedPerson) ? savedPerson : "both",
  view: loadView(),
  ui: { filterOpen: false, chartConfigOpen: false, historyQuery: "", freshBadges: new Set(), levelUp: false },
};

/* Entwurf der Schnellerfassung (Fenster „Wann, wie oft, wer?“) */
const quickDraft = { qid: null, date: "", qty: 1, tile: null };
let lastQuickDate = { date: null, at: 0 };

let store = null;
let settingsSaveTimer = null;
let lastDay = todayStr();
const charts = {};
const sheetTimers = {};

function saveView() { lsSet("sw.view", state.view); }
function personName(p) { return p === "A" ? state.settings.names.A : p === "B" ? state.settings.names.B : "Gemeinsam"; }
function whoLabel(p) { return p === "both" ? "gemeinsam" : `für ${personName(p)}`; }
function nsKey(key) { return state.mode === "firebase" ? `sw.fb.${HOUSEHOLD_ID}.${key}` : `sw.local.${key}`; }
function avatar(p, cls = "avatar-xs") {
  const inner = p === "both" ? '<i class="fa-solid fa-user-group" style="font-size:.8em"></i>' : escapeHtml(initialOf(personName(p)));
  return `<span class="${cls}" style="--pc:${PERSON_COLORS[p]};--pcd:${PERSON_DARK[p]}" aria-hidden="true">${inner}</span>`;
}


/* ═══════════════════════════════════════════════════════════════════════════
   6 · DATENSCHICHT: Firestore (Echtzeit) oder lokaler Demo-Modus
   ═══════════════════════════════════════════════════════════════════════════ */

function isFirebaseConfigured() {
  const probe = `${firebaseConfig.apiKey}|${firebaseConfig.projectId}|${firebaseConfig.appId}`;
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId) && !/HIER_/i.test(probe);
}

function createFirestoreStore() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const householdRef = doc(db, "households", HOUSEHOLD_ID);
  const entriesRef = collection(db, "households", HOUSEHOLD_ID, "entries");

  return {
    mode: "firebase",
    subscribeEntries(onData, onFail) {
      const q = query(entriesRef, orderBy("date", "desc"));
      return onSnapshot(q, { includeMetadataChanges: true }, snap => {
        onData(
          snap.docs.map(d => ({ ...d.data(), id: d.id })),
          { fromCache: snap.metadata.fromCache, changed: snap.docChanges().length > 0 },
        );
      }, onFail);
    },
    subscribeSettings(onData, onFail) {
      return onSnapshot(householdRef, snap => {
        onData(snap.exists() ? snap.data() : null, { fromCache: snap.metadata.fromCache });
      }, onFail);
    },
    add: data => addDoc(entriesRef, data).then(ref => ref.id),
    remove: id => deleteDoc(doc(entriesRef, id)),
    restore: (id, data) => setDoc(doc(entriesRef, id), data),
    saveSettings: data => setDoc(householdRef, data, { merge: true }),
  };
}

function createLocalStore() {
  const KEY_ENTRIES = "sw.local.entries";
  const KEY_SETTINGS = "sw.local.settings";
  const listeners = { entries: null, settings: null };
  const readEntries = () => { const list = lsGet(KEY_ENTRIES, []); return Array.isArray(list) ? list : []; };
  const emitEntries = () => listeners.entries?.(readEntries(), { fromCache: false, changed: true });
  const emitSettings = () => listeners.settings?.(lsGet(KEY_SETTINGS, null), { fromCache: false });
  const later = fn => setTimeout(fn, 0);
  const writeEntries = list => { lsSet(KEY_ENTRIES, list); later(emitEntries); };

  // Mehrere Tabs synchronisieren sich auch im Demo-Modus
  window.addEventListener("storage", e => {
    if (e.key === KEY_ENTRIES) emitEntries();
    if (e.key === KEY_SETTINGS) emitSettings();
  });

  return {
    mode: "local",
    subscribeEntries(cb) { listeners.entries = cb; later(emitEntries); },
    subscribeSettings(cb) { listeners.settings = cb; later(emitSettings); },
    add(data) { const id = uid(); writeEntries([...readEntries(), { ...data, id }]); return Promise.resolve(id); },
    remove(id) { writeEntries(readEntries().filter(e => e.id !== id)); return Promise.resolve(); },
    restore(id, data) { writeEntries([...readEntries().filter(e => e.id !== id), { ...data, id }]); return Promise.resolve(); },
    saveSettings(data) {
      const current = lsGet(KEY_SETTINGS, null);
      lsSet(KEY_SETTINGS, { ...(current && typeof current === "object" ? current : {}), ...data });
      later(emitSettings);
      return Promise.resolve();
    },
  };
}


/* ═══════════════════════════════════════════════════════════════════════════
   7 · BERECHNUNGEN
   ═══════════════════════════════════════════════════════════════════════════ */

function itemStart(r) { return toDn(r.since || state.settings.trackingStart); }
function activeRecurring() { return state.settings.recurring.filter(r => r.active && r.amount > 0); }
function grossFactor() { return state.settings.grossFactor; }

function earliestDn() {
  let min = toDn(state.settings.trackingStart);
  for (const r of activeRecurring()) min = Math.min(min, itemStart(r));
  for (const e of state.entries) min = Math.min(min, e.dn);
  return Math.min(min, todayDn());
}

function resolveRange() {
  const v = state.view;
  const today = todayDn();
  const { y, m } = partsOf(today);
  let start;
  let end = today;
  switch (v.range) {
    case "month": start = dnOf(y, m, 1); break;
    case "3m": start = dnOf(y, m - 2, 1); break;
    case "12m": start = dnOf(y, m - 11, 1); break;
    case "all": start = earliestDn(); break;
    case "custom": {
      let a = isValidDateStr(v.from) ? toDn(v.from) : dnOf(y, 1, 1);
      let b = isValidDateStr(v.to) ? toDn(v.to) : today;
      if (b < a) [a, b] = [b, a];
      start = a;
      end = Math.max(a, Math.min(b, today));
      break;
    }
    default: start = dnOf(y, 1, 1);
  }
  return { start, end: Math.max(start, end), today };
}

function computeDashboard() {
  const v = state.view;
  const range = resolveRange();
  const entries = v.source === "recurring" ? [] : state.entries.filter(e =>
    e.amount > 0 && e.dn >= range.start && e.dn <= range.end && v.cats.includes(e.category) && v.persons.includes(e.person));
  const recurring = (v.source === "active" || !v.persons.includes("both")) ? [] :
    activeRecurring().filter(r => v.cats.includes(r.category));
  const recurringParts = recurring.map(r => ({
    r,
    value: accrue(r.amount, Math.max(range.start, itemStart(r)), Math.min(range.end, range.today)),
  }));
  const activeSum = sum(entries.map(e => e.amount));
  const recurringSum = sum(recurringParts.map(p => p.value));
  const net = activeSum + recurringSum;
  return { range, entries, recurring, recurringParts, activeSum, recurringSum, net, gross: net * grossFactor() };
}

/* ── Zeitreihe für das Verlaufsdiagramm ── */
function autoInterval(range) {
  const days = range.end - range.start + 1;
  if (days <= 31) return "day";
  if (days <= 120) return "week";
  if (days <= 1100) return "month";
  return "year";
}

function makeBuckets(start, end, interval) {
  const out = [];
  if (interval === "day") {
    for (let d = start; d <= end; d++) out.push({ start: d, end: d });
  } else if (interval === "week") {
    for (let w = mondayOf(start); w <= end; w += 7) out.push({ start: Math.max(w, start), end: Math.min(w + 6, end), anchor: w });
  } else if (interval === "month") {
    let { y, m } = partsOf(start);
    while (dnOf(y, m, 1) <= end) {
      out.push({ start: Math.max(dnOf(y, m, 1), start), end: Math.min(dnOf(y, m + 1, 1) - 1, end), y, m });
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
  } else {
    for (let y = partsOf(start).y; dnOf(y, 1, 1) <= end; y++) {
      out.push({ start: Math.max(dnOf(y, 1, 1), start), end: Math.min(dnOf(y + 1, 1, 1) - 1, end), y });
    }
  }
  return out;
}

function bucketIndexer(interval, start) {
  if (interval === "day") return d => d - start;
  if (interval === "week") { const w0 = mondayOf(start); return d => Math.floor((mondayOf(d) - w0) / 7); }
  if (interval === "month") { const p0 = partsOf(start); return d => { const p = partsOf(d); return (p.y - p0.y) * 12 + (p.m - p0.m); }; }
  const y0 = partsOf(start).y;
  return d => partsOf(d).y - y0;
}

function bucketLabel(b, interval, multiYear) {
  const p = partsOf(b.start);
  if (interval === "day") return { short: `${p.d}.${p.m}.`, long: `${WEEKDAYS[p.wd]}., ${fmtDate(b.start)}` };
  if (interval === "week") { const kw = isoWeek(b.anchor); return { short: `KW ${kw}`, long: `KW ${kw}: ${fmtDayShort(b.start)} bis ${fmtDayShort(b.end)}` }; }
  if (interval === "month") return { short: multiYear ? `${MONTHS_SHORT[b.m - 1]} ${String(b.y).slice(2)}` : MONTHS_SHORT[b.m - 1], long: `${MONTHS[b.m - 1]} ${b.y}` };
  return { short: String(b.y), long: String(b.y) };
}

function seriesKey(source, category, person, split) {
  if (split === "source") return source;
  if (split === "category") return category;
  if (split === "person") return person;
  return "total";
}

function seriesMeta(key, split) {
  if (split === "source") return SOURCE_META[key];
  if (split === "category") return { label: CATEGORIES[key].label, color: CATEGORIES[key].color };
  if (split === "person") return { label: personName(key), color: PERSON_COLORS[key] };
  return { label: state.view.value === "gross" ? "Brutto-Äquivalent" : "Netto-Ersparnis", color: "#0E9F6E" };
}

function seriesOrder(split) {
  if (split === "source") return ["recurring", "active"];
  if (split === "category") return CAT_KEYS;
  if (split === "person") return PERSONS;
  return ["total"];
}

function buildTimeSeries(d) {
  const v = state.view;
  const order = ["day", "week", "month", "year"];
  let interval = v.interval === "auto" ? autoInterval(d.range) : v.interval;
  let buckets = makeBuckets(d.range.start, d.range.end, interval);
  let coarsened = false;
  while (buckets.length > MAX_BUCKETS && interval !== "year") {
    interval = order[order.indexOf(interval) + 1];
    buckets = makeBuckets(d.range.start, d.range.end, interval);
    coarsened = true;
  }

  const split = v.split;
  const series = new Map();
  const ensure = key => {
    if (!series.has(key)) series.set(key, new Array(buckets.length).fill(0));
    return series.get(key);
  };
  const indexOf = bucketIndexer(interval, d.range.start);

  for (const e of d.entries) {
    const i = indexOf(e.dn);
    if (i >= 0 && i < buckets.length) ensure(seriesKey("active", e.category, e.person, split))[i] += e.amount;
  }
  for (const r of d.recurring) {
    const s0 = itemStart(r);
    const arr = ensure(seriesKey("recurring", r.category, "both", split));
    buckets.forEach((b, i) => {
      arr[i] += accrue(r.amount, Math.max(b.start, s0), Math.min(b.end, d.range.today));
    });
  }

  const factor = v.value === "gross" ? grossFactor() : 1;
  const multiYear = partsOf(d.range.start).y !== partsOf(d.range.end).y;
  const result = seriesOrder(split)
    .filter(key => series.has(key))
    .map(key => {
      let running = 0;
      const data = series.get(key).map(x => {
        const val = x * factor;
        running += val;
        return round2(v.cumulative ? running : val);
      });
      return { key, ...seriesMeta(key, split), data };
    })
    .filter(s => s.data.some(x => x > 0) || split === "none");

  return { buckets, interval, coarsened, labels: buckets.map(b => bucketLabel(b, interval, multiYear)), series: result };
}

/* ── Verteilung (Donut) ── */
function buildDistribution(d) {
  const dim = state.view.donut;
  const map = new Map();
  const add = (key, label, color, value) => {
    if (!(value > 0)) return;
    const item = map.get(key) || { key, label, color, value: 0 };
    item.value += value;
    map.set(key, item);
  };
  for (const e of d.entries) {
    if (dim === "category") add(e.category, CATEGORIES[e.category].label, CATEGORIES[e.category].color, e.amount);
    else if (dim === "person") add(e.person, personName(e.person), PERSON_COLORS[e.person], e.amount);
    else if (dim === "source") add("active", SOURCE_META.active.label, SOURCE_META.active.color, e.amount);
    else add(`e:${e.quickId || e.title.trim().toLowerCase()}`, e.title, null, e.amount);
  }
  for (const { r, value } of d.recurringParts) {
    if (dim === "category") add(r.category, CATEGORIES[r.category].label, CATEGORIES[r.category].color, value);
    else if (dim === "person") add("both", personName("both"), PERSON_COLORS.both, value);
    else if (dim === "source") add("recurring", SOURCE_META.recurring.label, SOURCE_META.recurring.color, value);
    else add(`r:${r.id}`, r.label, null, value);
  }
  let items = [...map.values()].sort((a, b) => b.value - a.value);
  if (dim === "item") {
    if (items.length > 8) {
      const rest = items.slice(7);
      items = [...items.slice(0, 7), { key: "rest", label: `Weitere (${rest.length})`, color: "#D5DCD8", value: sum(rest.map(x => x.value)) }];
    }
    items.forEach((it, i) => { if (!it.color) it.color = ITEM_PALETTE[i % ITEM_PALETTE.length]; });
  }
  return items;
}

/* ── Stufen & Abzeichen (immer über alle Daten, unabhängig von Filtern) ── */
function allTimeNet() {
  const today = todayDn();
  let total = sum(state.entries.filter(e => e.dn <= today).map(e => e.amount));
  for (const r of activeRecurring()) total += accrue(r.amount, itemStart(r), today);
  return total;
}

function levelInfo(total) {
  let idx = 0;
  LEVELS.forEach((l, i) => { if (total >= l.min) idx = i; });
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  return {
    idx, cur, next,
    progress: next ? Math.min(1, Math.max(0, (total - cur.min) / (next.min - cur.min))) : 1,
    remaining: next ? next.min - total : 0,
  };
}

function matchesQuick(e, key) {
  if (e.quickId) return e.quickId === key;
  return QUICK_MATCH[key] ? QUICK_MATCH[key].test(e.title) : false;
}

function badgeStats() {
  const list = state.entries.filter(e => e.amount > 0);
  const weeks = new Map();
  const months = new Map();
  const cats = new Set();
  const quick = Object.fromEntries(Object.keys(QUICK_MATCH).map(k => [k, 0]));
  let maxSingle = 0;
  for (const e of list) {
    const w = mondayOf(e.dn);
    const ws = weeks.get(w) || { A: false, B: false, both: false };
    ws[e.person] = true;
    weeks.set(w, ws);
    const mk = e.date.slice(0, 7);
    months.set(mk, (months.get(mk) || 0) + e.amount);
    cats.add(e.category);
    maxSingle = Math.max(maxSingle, e.amount);
    for (const key of Object.keys(quick)) if (matchesQuick(e, key)) quick[key] += e.qty;
  }
  let streak = 0;
  let run = 0;
  let prev = null;
  for (const w of [...weeks.keys()].sort((a, b) => a - b)) {
    run = prev !== null && w - prev === 7 ? run + 1 : 1;
    streak = Math.max(streak, run);
    prev = w;
  }
  return {
    count: sum(list.map(e => e.qty)),
    quick,
    categories: cats.size,
    maxSingle,
    streak,
    teamWeeks: [...weeks.values()].filter(s => s.A && s.B).length,
    bestMonth: months.size ? Math.max(...months.values()) : 0,
    monthsActive: months.size,
  };
}

function badgeList() {
  const stats = badgeStats();
  return BADGES.map(b => {
    const val = b.value(stats);
    return { ...b, val, done: val >= b.target, pct: Math.min(100, (val / b.target) * 100) };
  });
}


/* ═══════════════════════════════════════════════════════════════════════════
   8 · ANIMATIONEN: hochzählende Zahlen & wachsende Balken
   Jeder animierte Wert hat einen Schlüssel. Ändert sich ein Wert, läuft die
   Animation vom alten zum neuen Stand. Beim Öffnen eines Tabs starten die
   Werte dieses Tabs bei null (Prefix „t.“ = Tracker, „d.“ = Dashboard).
   ═══════════════════════════════════════════════════════════════════════════ */

const anim = { counts: new Map(), bars: new Map() };

function countFormat(v, to, fmt) {
  if (fmt === "int") return numDe(Math.round(v) || 0, 0);
  const target = round2(to) || 0;
  const whole = Math.abs(target) >= 1000 || Number.isInteger(target);
  return (whole ? EUR_WHOLE : EUR_CENTS).format((whole ? Math.round(v) : round2(v)) || 0);
}

function countSpan(key, value, { fmt = "money", cls = "", ghost = false } = {}) {
  const to = Number(value) || 0;
  const prev = anim.counts.get(key);
  const from = REDUCED_MOTION ? to : (prev ? prev.current : 0);
  const text = escapeHtml(countFormat(from, to, fmt));
  return `<span class="${cls}" data-count="${escapeHtml(key)}" data-to="${to}" data-fmt="${fmt}"${ghost ? ` data-ghost="${text}"` : ""}>${text}</span>`;
}

function barAttr(key, pct, extraStyle = "") {
  const w = Math.max(0, Math.min(100, Number(pct) || 0));
  const from = REDUCED_MOTION ? w : (anim.bars.has(key) ? anim.bars.get(key) : 0);
  return `data-bar="${escapeHtml(key)}" data-w="${w}" style="width:${from}%;${extraStyle}"`;
}

function runBars(root) {
  const els = $$("[data-bar]", root);
  if (!els.length) return;
  document.body.getBoundingClientRect(); // Startbreite festschreiben, damit die Übergänge laufen
  for (const el of els) {
    const w = Number(el.dataset.w) || 0;
    el.style.width = `${w}%`;
    anim.bars.set(el.dataset.bar, w);
  }
}

function runCounts(root) {
  for (const el of $$("[data-count]", root)) {
    const key = el.dataset.count;
    const to = Number(el.dataset.to) || 0;
    const fmt = el.dataset.fmt || "money";
    const prev = anim.counts.get(key);
    if (prev?.raf) cancelAnimationFrame(prev.raf);
    const from = REDUCED_MOTION ? to : (prev ? prev.current : 0);
    const st = { current: from, raf: 0 };
    anim.counts.set(key, st);
    const write = v => {
      const text = countFormat(v, to, fmt);
      el.textContent = text;
      if (el.hasAttribute("data-ghost")) el.setAttribute("data-ghost", text);
    };
    if (Math.abs(to - from) < 0.005) { st.current = to; write(to); continue; }
    const duration = 950;
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - t0) / duration);
      st.current = p < 1 ? from + (to - from) * (1 - Math.pow(1 - p, 4)) : to;
      write(st.current);
      st.raf = p < 1 ? requestAnimationFrame(tick) : 0;
    };
    st.raf = requestAnimationFrame(tick);
  }
}

function runAnimations(root = document) {
  runBars(root);
  runCounts(root);
}

function resetAnim(prefix) {
  for (const [key, st] of anim.counts) {
    if (key.startsWith(prefix)) {
      if (st.raf) cancelAnimationFrame(st.raf);
      anim.counts.delete(key);
    }
  }
  for (const key of [...anim.bars.keys()]) if (key.startsWith(prefix)) anim.bars.delete(key);
}

/* Diagramme: Balken wachsen beim Öffnen nacheinander von unten nach oben */
function chartIntroAnimation(points) {
  if (REDUCED_MOTION) return false;
  const per = points > 1 ? Math.min(40, 650 / points) : 0;
  return {
    duration: 750,
    easing: "easeOutQuart",
    delay: ctx => (ctx.type === "data" && ctx.mode === "default" && !ctx.chart.$introDone
      ? Math.round(ctx.dataIndex * per + ctx.datasetIndex * 80)
      : 0),
    onComplete: ev => { if (ev?.chart) ev.chart.$introDone = true; },
  };
}

function destroyCharts() {
  for (const key of Object.keys(charts)) {
    charts[key].destroy();
    delete charts[key];
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   9 · RENDERING: Status, Hinweise, Tracker, Personen
   ═══════════════════════════════════════════════════════════════════════════ */

function segButtons(items, current, attrs) {
  return items.map(([value, label]) =>
    `<button type="button" class="seg" ${attrs(value)} aria-pressed="${value === current}">${escapeHtml(label)}</button>`).join("");
}

function renderStatus() {
  let dot = "bg-jade-500";
  let label = "Live";
  if (state.mode === "local") { dot = "bg-amber-400"; label = "Demo"; }
  else if (state.error) { dot = "bg-rose-500"; label = "Fehler"; }
  else if (!state.online) { dot = "bg-zinc-400"; label = "Offline"; }
  const live = label === "Live";
  $("#syncStatus").innerHTML = `<span class="status-dot ${dot}${live ? " live" : ""}"></span>${label}`;
}

function renderBanner() {
  const el = $("#banner");
  let html = "";
  if (state.error) {
    html = `
      <div class="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-900">
        <i class="fa-solid fa-triangle-exclamation mt-0.5"></i>
        <p class="flex-1">${escapeHtml(state.error)}</p>
        <button type="button" data-action="dismiss-error" class="-m-1 grid h-7 w-7 place-items-center rounded-full hover:bg-rose-100" aria-label="Hinweis schließen"><i class="fa-solid fa-xmark"></i></button>
      </div>`;
  } else if (state.mode === "local" && !lsGet("sw.hideDemoBanner", false)) {
    html = `
      <div class="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        <i class="fa-solid fa-flask mt-0.5"></i>
        <p class="flex-1"><b>Demo-Modus:</b> Die Daten bleiben nur in diesem Browser. Trag deine Firebase-Config oben in <code>app.js</code> ein, dann synchronisiert ihr beide in Echtzeit.</p>
        <button type="button" data-action="dismiss-demo" class="-m-1 grid h-7 w-7 place-items-center rounded-full hover:bg-amber-100" aria-label="Hinweis schließen"><i class="fa-solid fa-xmark"></i></button>
      </div>`;
  }
  el.innerHTML = html;
  el.classList.toggle("hidden", !html);
}

function renderQuickActions() {
  $("#quickActions").innerHTML = QUICK_ACTIONS.map(q => `
    <button type="button" data-action="quick" data-id="${q.id}" aria-haspopup="dialog"
      class="qa relative overflow-hidden rounded-[1.25rem] border border-mist bg-white p-4 text-left shadow-soft transition hover:border-jade-300 active:scale-[0.97]">
      <span class="flex items-start justify-between">
        <span class="grid h-12 w-12 place-items-center rounded-2xl bg-jade-50 text-2xl" aria-hidden="true">${q.emoji}</span>
        <span class="text-[11px] text-ink-mute tabular" data-qa-count="${q.id}"></span>
      </span>
      <span class="mt-4 block text-sm font-medium text-ink-soft">${escapeHtml(q.title)}</span>
      <span class="block text-2xl font-semibold tracking-tight tabular">${money(q.amount)}</span>
      <span class="block text-xs text-ink-mute tabular" data-qa-gross="${q.id}"></span>
      <span class="qa-check pointer-events-none absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-jade-500 text-white" aria-hidden="true"><i class="fa-solid fa-check text-sm"></i></span>
    </button>`).join("");
}

/* Aufteilung nach Person als animierter Balken (Matze links, Pia rechts, gemeinsam in der Mitte) */
function personSplitHtml(prefix, sums, { factor = 1, legend = true } = {}) {
  const total = sums.A + sums.B + sums.both;
  if (!(total > 0)) return "";
  return `
    <div class="mt-4">
      <div class="flex h-2 overflow-hidden rounded-full bg-paper">
        ${["A", "both", "B"].map(p => `<div class="bar h-full" ${barAttr(`${prefix}.${p}`, (sums[p] / total) * 100, `background:${PERSON_COLORS[p]}`)}></div>`).join("")}
      </div>
      ${legend ? `
        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-mute">
          ${PERSONS.filter(p => sums[p] > 0).map(p => `
            <span class="inline-flex items-center gap-1.5">${avatar(p)}${escapeHtml(personName(p))}
              <b class="font-semibold text-ink tabular">${money(sums[p] * factor)}</b></span>`).join("")}
        </div>` : ""}
    </div>`;
}

function renderTracker() {
  const s = state.settings;
  const f = s.grossFactor;
  const t = todayDn();
  const { y, m } = partsOf(t);
  const monthStart = dnOf(y, m, 1);
  const monthEntries = state.entries.filter(e => e.amount > 0 && e.dn >= monthStart && e.dn <= t);
  const monthSum = sum(monthEntries.map(e => e.amount));
  const todayCount = sum(state.entries.filter(e => e.dn === t).map(e => e.qty));
  const goal = s.monthlyGoal;
  const pct = goal > 0 ? Math.min(100, (monthSum / goal) * 100) : 0;
  const recurringMonthly = sum(activeRecurring().map(r => r.amount));
  const byPerson = { A: 0, B: 0, both: 0 };
  for (const e of monthEntries) byPerson[e.person] += e.amount;

  const root = $("#trackerSummary");
  root.innerHTML = `
    <div class="rounded-[1.5rem] border border-mist bg-white p-5 shadow-soft">
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-medium text-ink-soft">${MONTHS[m - 1]} ${y}</p>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-jade-50 px-2.5 py-1 text-xs font-medium text-jade-700 tabular">
          <i class="fa-solid fa-bolt text-[10px]"></i>${todayCount === 0 ? "Heute noch nichts" : `Heute ${todayCount}-mal verzichtet`}
        </span>
      </div>
      <p class="mt-3 text-[2.5rem] font-semibold leading-none tracking-tight tabular shadow-mini">${countSpan("t.month", monthSum)}</p>
      <p class="mt-2 text-sm text-ink-mute">aktiv gespart, entspricht ${countSpan("t.monthGross", monthSum * f, { cls: "font-medium text-ink tabular" })} brutto</p>
      ${goal > 0 ? `
        <div class="mt-5">
          <div class="mb-1.5 flex justify-between text-xs text-ink-mute">
            ${pct >= 100
              ? `<span class="font-medium text-jade-700"><i class="fa-solid fa-flag-checkered mr-1"></i>Monatsziel erreicht</span>`
              : `<span>${numDe(pct, 0)} % vom Monatsziel</span>`}
            <span class="tabular">${money(goal)}</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-paper">
            <div class="bar h-full rounded-full bg-jade-500" ${barAttr("t.goal", pct)}></div>
          </div>
        </div>` : ""}
      ${monthSum > 0 ? personSplitHtml("t.split", byPerson) : ""}
      <div class="mt-5 flex items-center gap-2 border-t border-mist pt-4 text-xs text-ink-mute">
        <i class="fa-solid fa-arrows-rotate text-jade-600"></i>
        <span>Zusätzlich laufen <b class="font-semibold text-ink tabular">${money(recurringMonthly)}</b> pro Monat automatisch mit.</span>
        <button type="button" data-action="open-settings" data-section="settings-recurring" class="ml-auto shrink-0 font-medium text-jade-700 hover:underline">Anpassen</button>
      </div>
    </div>`;

  renderPersonSwitch();

  const counts = {};
  for (const e of monthEntries) if (e.quickId) counts[e.quickId] = (counts[e.quickId] || 0) + e.qty;
  for (const q of QUICK_ACTIONS) {
    const c = $(`[data-qa-count="${q.id}"]`);
    const g = $(`[data-qa-gross="${q.id}"]`);
    if (c) c.textContent = counts[q.id] ? `${counts[q.id]}× im ${MONTHS_SHORT[m - 1]}` : "";
    if (g) g.textContent = `${money(q.amount * f)} brutto`;
  }

  const seen = new Set();
  const titles = [];
  for (const e of state.entries) {
    const key = e.title.toLowerCase();
    if (!seen.has(key)) { seen.add(key); titles.push(e.title); }
    if (titles.length >= 15) break;
  }
  $("#titleSuggestions").innerHTML = titles.map(t2 => `<option value="${escapeHtml(t2)}"></option>`).join("");

  runAnimations(root);
}

/* Der Umschalter wird nur neu gebaut, wenn sich Namen ändern – so kann die Markierung gleiten */
function renderPersonSwitch() {
  const track = $("#personSwitch");
  const signature = PERSONS.map(personName).join("|");
  if (track.dataset.sig !== signature) {
    track.dataset.sig = signature;
    $$(".person-btn", track).forEach(b => b.remove());
    track.insertAdjacentHTML("beforeend", PERSONS.map(p => `
      <button type="button" class="person-btn" data-action="person" data-value="${p}" style="--pcd:${PERSON_DARK[p]}">
        <span class="person-avatar" aria-hidden="true">${p === "both" ? '<i class="fa-solid fa-user-group text-[11px]"></i>' : escapeHtml(initialOf(personName(p)))}</span>
        <span class="truncate">${escapeHtml(personName(p))}</span>
      </button>`).join(""));
  }
  updatePersonSwitch();
}

function updatePersonSwitch() {
  const track = $("#personSwitch");
  $$(".person-btn", track).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.value === state.person)));
  const thumb = $(".person-thumb", track);
  thumb.style.transform = `translateX(calc(${PERSONS.indexOf(state.person)} * (100% + 4px)))`;
  thumb.style.backgroundColor = PERSON_DARK[state.person];
  const who = $("#formWho");
  if (who) who.textContent = state.person === "both" ? "gemeinsam speichern" : `für ${personName(state.person)} speichern`;
}

function setPerson(p) {
  if (!PERSONS.includes(p)) return;
  state.person = p;
  lsSet("sw.person", p);
  updatePersonSwitch();
}


/* ═══════════════════════════════════════════════════════════════════════════
   10 · RENDERING: Dashboard
   ═══════════════════════════════════════════════════════════════════════════ */

function renderDashboard() {
  if (state.tab !== "dashboard") return;
  renderFilterBar();
  const d = computeDashboard();
  renderKpis(d);
  renderLevel();
  renderHistoryChart(d);
  renderDistribution(d);
  renderPersonCard(d);
  renderRecurringCard();
  renderBadges();
  runAnimations($('[data-tab-panel="dashboard"]'));
}

function activeFilterCount() {
  const v = state.view;
  return (v.source !== "all" ? 1 : 0) + (v.cats.length !== CAT_KEYS.length ? 1 : 0) + (v.persons.length !== PERSONS.length ? 1 : 0);
}

function renderFilterBar() {
  const v = state.view;
  const scroller = $("#rangeScroller");
  const scrollLeft = scroller ? scroller.scrollLeft : 0;
  const count = activeFilterCount();
  const today = todayStr();

  $("#filterBar").innerHTML = `
    <div class="flex items-center gap-2">
      <div id="rangeScroller" class="no-scrollbar -ml-4 flex-1 overflow-x-auto pl-4">
        <div class="flex w-max gap-1.5 pr-1">
          ${RANGES.map(([k, label]) => `<button type="button" class="chip chip-range" data-action="view" data-key="range" data-value="${k}" aria-pressed="${v.range === k}">${label}</button>`).join("")}
        </div>
      </div>
      <button type="button" data-action="toggle-filters" aria-expanded="${state.ui.filterOpen}"
        class="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border ${state.ui.filterOpen || count ? "border-jade-300 bg-jade-50 text-jade-700" : "border-mist bg-white text-ink-soft"}" aria-label="Filter">
        <i class="fa-solid fa-filter text-xs"></i>
        ${count ? `<span class="absolute -right-1 -top-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-jade-600 px-1 text-[10px] font-semibold text-white">${count}</span>` : ""}
      </button>
    </div>

    ${v.range === "custom" ? `
      <div class="mt-3 grid grid-cols-2 gap-2">
        <label class="field-label">Von<input type="date" class="input mt-1" data-view-input="from" value="${v.from}" max="${today}"></label>
        <label class="field-label">Bis<input type="date" class="input mt-1" data-view-input="to" value="${v.to}" max="${today}"></label>
      </div>` : ""}

    ${state.ui.filterOpen ? `
      <div class="mt-3 space-y-5 rounded-[1.25rem] border border-mist bg-white p-4 shadow-soft">
        <div>
          <p class="text-sm font-medium">Welche Ersparnisse?</p>
          <div class="seg-track full mt-2">${segButtons(SOURCES, v.source, val => `data-action="view" data-key="source" data-value="${val}"`)}</div>
        </div>
        <div>
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium">Kategorien</p>
            <div class="flex gap-3 text-xs font-medium text-jade-700">
              <button type="button" data-action="cats-all">Alle</button>
              <button type="button" data-action="cats-none">Keine</button>
            </div>
          </div>
          <div class="mt-2 flex flex-wrap gap-1.5">
            ${CAT_KEYS.map(k => `<button type="button" class="chip" data-action="toggle-cat" data-value="${k}" aria-pressed="${v.cats.includes(k)}"><i class="fa-solid ${CATEGORIES[k].icon} text-[11px]"></i>${CATEGORIES[k].label}</button>`).join("")}
          </div>
        </div>
        <div>
          <p class="text-sm font-medium">Personen</p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            ${PERSONS.map(p => `<button type="button" class="chip" data-action="toggle-person" data-value="${p}" aria-pressed="${v.persons.includes(p)}">${avatar(p)}${escapeHtml(personName(p))}</button>`).join("")}
          </div>
          <p class="mt-2 text-xs text-ink-mute">Laufende Einsparungen zählen als „Gemeinsam“.</p>
        </div>
        <div class="flex justify-end">
          <button type="button" data-action="reset-filters" class="text-xs font-medium text-ink-mute hover:text-ink"><i class="fa-solid fa-rotate-left mr-1"></i>Filter zurücksetzen</button>
        </div>
      </div>` : ""}`;

  const next = $("#rangeScroller");
  if (next) next.scrollLeft = scrollLeft;
}

function miniStat(label, valueHtml, hint) {
  return `
    <div class="rounded-2xl border border-mist bg-white px-3 py-3">
      <p class="text-xs text-ink-mute">${label}</p>
      <p class="mt-1 truncate text-base font-semibold tracking-tight tabular">${valueHtml}</p>
      <p class="text-[11px] text-ink-mute">${hint}</p>
    </div>`;
}

function renderKpis(d) {
  const s = state.settings;
  const f = s.grossFactor;
  const tax = Math.round((1 - 1 / f) * 100);
  const activeShare = d.net > 0 ? (d.activeSum / d.net) * 100 : 0;
  const recurringShare = d.net > 0 ? 100 - activeShare : 0;
  const months = Math.max(1, (d.range.end - d.range.start + 1) / 30.4375);
  const recurringMonthly = sum(d.recurring.map(r => r.amount));
  const hours = s.hourlyWage > 0 ? d.gross / s.hourlyWage : 0;
  const count = sum(d.entries.map(e => e.qty));

  $("#kpiArea").innerHTML = `
    <div class="mt-4 flex items-center justify-between gap-3">
      <p class="text-xs text-ink-mute tabular"><i class="fa-regular fa-calendar mr-1"></i>${fmtDate(d.range.start)} bis ${fmtDate(d.range.end)}</p>
      <div class="seg-track">${segButtons(VALUE_MODES, state.view.value, v => `data-action="view" data-key="value" data-value="${v}"`)}</div>
    </div>

    <article class="mt-3 overflow-hidden rounded-[1.75rem] border border-mist bg-white shadow-soft">
      <div class="p-5 pb-6">
        <p class="text-sm font-medium text-ink-soft">Netto-Ersparnis</p>
        <p class="mt-3 text-[2.75rem] font-semibold tracking-tight tabular sm:text-[3.25rem]">${countSpan("d.net", d.net, { cls: "shadow-figure", ghost: true })}</p>
        <div class="mt-5 flex h-2 overflow-hidden rounded-full bg-paper">
          <div class="bar h-full bg-jade-500" ${barAttr("d.split.active", activeShare)}></div>
          <div class="bar h-full bg-ink" ${barAttr("d.split.recurring", recurringShare)}></div>
        </div>
        <div class="mt-2 flex flex-wrap justify-between gap-2 text-xs text-ink-mute">
          <span><span class="mr-1.5 inline-block h-2 w-2 rounded-full bg-jade-500"></span>Aktive Verzichte ${countSpan("d.activeSum", d.activeSum, { cls: "font-semibold text-ink tabular" })}</span>
          <span><span class="mr-1.5 inline-block h-2 w-2 rounded-full bg-ink"></span>Laufend ${countSpan("d.recurringSum", d.recurringSum, { cls: "font-semibold text-ink tabular" })}</span>
        </div>
      </div>
      <div class="bg-ink p-5 text-white">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <p class="text-sm font-medium text-jade-300">Brutto-Äquivalenz</p>
          <p class="text-xs text-white/60 tabular">Faktor ${numDe(f, 2)} bei rund ${tax} % Abgaben</p>
        </div>
        <p class="mt-2 text-[2.25rem] font-semibold leading-none tracking-tight text-jade-300 tabular">${countSpan("d.gross", d.gross)}</p>
        <p class="mt-3 max-w-[60ch] text-sm leading-relaxed text-white/75">Um das gleiche Geld für Konsum auszugeben, müsste jemand diesen Betrag brutto mehr verdienen.</p>
        ${hours > 0 ? `<p class="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/85"><i class="fa-solid fa-hourglass-half text-jade-300"></i>Das sind etwa ${countSpan("d.hours", hours, { fmt: "int" })} Arbeitsstunden</p>` : ""}
      </div>
    </article>

    <div class="mt-3 grid grid-cols-3 gap-3">
      ${miniStat("Verzichte", countSpan("d.count", count, { fmt: "int" }), "im Zeitraum")}
      ${miniStat("Ø pro Monat", countSpan("d.avg", d.net / months), "netto")}
      ${miniStat("Laufend", countSpan("d.recurringMonthly", recurringMonthly), "pro Monat")}
    </div>`;
}

function renderLevel() {
  const total = allTimeNet();
  const L = levelInfo(total);
  const pop = state.ui.levelUp;
  state.ui.levelUp = false;
  $("#levelCard").innerHTML = `
    <div class="flex items-center gap-4 rounded-[1.25rem] border border-mist bg-white p-4 shadow-soft">
      <div class="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-ink text-jade-300${pop ? " badge-pop" : ""}">
        <i class="fa-solid ${L.cur.icon} text-xl"></i>
        <span class="absolute -bottom-1.5 -right-1.5 grid h-6 min-w-[1.5rem] place-items-center rounded-full bg-jade-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">${L.idx + 1}</span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-baseline justify-between gap-2">
          <p class="truncate text-sm font-semibold">Stufe ${L.idx + 1}: ${L.cur.name}</p>
          <p class="shrink-0 text-xs text-ink-mute tabular">${countSpan("d.levelTotal", total)} gesamt</p>
        </div>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-paper">
          <div class="bar h-full rounded-full bg-jade-500" ${barAttr("d.level", L.progress * 100)}></div>
        </div>
        <p class="mt-1.5 text-xs text-ink-mute">${L.next
          ? `Noch <b class="font-medium text-ink tabular">${money(L.remaining)}</b> bis „${L.next.name}“`
          : "Höchste Stufe erreicht."}</p>
      </div>
    </div>`;
}

function upsertChart(id, config) {
  const canvas = document.getElementById(id);
  if (!canvas || !window.Chart) return;
  const existing = charts[id];
  if (existing && existing.config.type === config.type) {
    existing.data = config.data;
    existing.options = config.options;
    existing.update();
    return;
  }
  if (existing) existing.destroy();
  charts[id] = new window.Chart(canvas, config);
}

function chartConfigHtml() {
  const v = state.view;
  const row = (label, html) => `<div><p class="mb-1.5 text-xs font-medium text-ink-soft">${label}</p>${html}</div>`;
  return `
    <div class="mt-4 space-y-3 rounded-2xl bg-paper p-3">
      ${row("Darstellung", `<div class="seg-track full">${segButtons(CHART_TYPES, v.chartType, val => `data-action="view" data-key="chartType" data-value="${val}"`)}</div>`)}
      ${row("Intervall", `<div class="seg-track full">${segButtons(INTERVALS, v.interval, val => `data-action="view" data-key="interval" data-value="${val}"`)}</div>`)}
      ${row("Aufteilen nach", `<div class="seg-track full">${segButtons(SPLITS, v.split, val => `data-action="view" data-key="split" data-value="${val}"`)}</div>`)}
      <label class="flex cursor-pointer items-center justify-between gap-3 pt-1">
        <span class="text-sm text-ink-soft">Kumuliert anzeigen</span>
        <input type="checkbox" class="switch" data-view-toggle="cumulative" ${v.cumulative ? "checked" : ""}>
      </label>
    </div>`;
}

function renderHistoryChart(d) {
  const v = state.view;
  const ts = buildTimeSeries(d);
  const intervalLabel = { day: "täglich", week: "wöchentlich", month: "monatlich", year: "jährlich" }[ts.interval];
  const splitLabel = { source: "nach Quelle", category: "nach Kategorie", person: "nach Person", none: "als Summe" }[v.split];
  $("#chartSubtitle").textContent =
    `${intervalLabel[0].toUpperCase()}${intervalLabel.slice(1)}, ${splitLabel}, ${v.value === "gross" ? "brutto" : "netto"}${v.cumulative ? ", kumuliert" : ""}${ts.coarsened ? " (automatisch vergröbert)" : ""}`;

  const cfg = $("#chartConfig");
  cfg.classList.toggle("hidden", !state.ui.chartConfigOpen);
  if (state.ui.chartConfigOpen) cfg.innerHTML = chartConfigHtml();

  const hasData = ts.series.some(s => s.data.some(x => x > 0));
  const empty = $("#historyEmpty");
  empty.classList.toggle("hidden", hasData);
  empty.classList.toggle("grid", !hasData);
  empty.innerHTML = window.Chart
    ? `<span>Keine Ersparnisse für diese Auswahl.<br><span class="text-xs">Zeitraum oder Filter anpassen.</span></span>`
    : `<span>Diagramm-Bibliothek konnte nicht geladen werden.</span>`;
  if (!window.Chart) { empty.classList.remove("hidden"); empty.classList.add("grid"); return; }

  const isBar = v.chartType === "bar";
  const stacked = ts.series.length > 1;
  upsertChart("historyChart", {
    type: isBar ? "bar" : "line",
    data: {
      labels: ts.labels.map(l => l.short),
      datasets: ts.series.map(s => isBar
        ? { label: s.label, data: s.data, backgroundColor: s.color, borderRadius: 4, borderSkipped: false, maxBarThickness: 38, categoryPercentage: 0.75, barPercentage: 0.9, stack: "s" }
        : { label: s.label, data: s.data, borderColor: s.color, backgroundColor: hexA(s.color, 0.2), borderWidth: 2, fill: stacked ? "stack" : "origin", tension: 0.35, pointRadius: 0, pointHoverRadius: 4, pointHitRadius: 12, stack: "s" }),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: chartIntroAnimation(ts.labels.length),
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: stacked, position: "bottom", labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 7, boxHeight: 7, padding: 14, font: { size: 11 } } },
        tooltip: {
          backgroundColor: "#1B201D", padding: 12, cornerRadius: 12, boxPadding: 4,
          filter: item => item.parsed.y !== 0,
          callbacks: {
            title: items => (items.length ? ts.labels[items[0].dataIndex].long : ""),
            label: ctx => ` ${ctx.dataset.label}: ${money(ctx.parsed.y)}`,
            footer: items => (items.length > 1 ? `Summe: ${money(sum(items.map(i => i.parsed.y)))}` : ""),
          },
        },
      },
      scales: {
        x: { stacked, grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, autoSkip: true, autoSkipPadding: 14, color: "#8E968F", font: { size: 11 } } },
        y: { stacked, beginAtZero: true, border: { display: false }, grid: { color: "#EEF2EF" }, ticks: { maxTicksLimit: 5, color: "#8E968F", font: { size: 11 }, callback: val => moneyCompact(val) } },
      },
    },
  });
}

function renderDistribution(d) {
  const items = buildDistribution(d);
  const isGross = state.view.value === "gross";
  const f = isGross ? grossFactor() : 1;
  const total = sum(items.map(i => i.value));
  const dim = state.view.donut;

  $("#donutDims").innerHTML = segButtons(DONUT_DIMS, dim, v => `data-action="view" data-key="donut" data-value="${v}"`);
  $("#donutCenter").innerHTML = `
    <p class="text-xs text-ink-mute">${isGross ? "Brutto" : "Netto"}</p>
    <p class="text-lg font-semibold tracking-tight tabular">${countSpan("d.donutTotal", total * f)}</p>`;
  $("#donutLegend").innerHTML = items.length
    ? items.map(it => {
        const pct = total ? (it.value / total) * 100 : 0;
        return `
          <li class="py-2.5">
            <div class="flex items-center gap-2 text-sm">
              <span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background:${it.color}"></span>
              <span class="min-w-0 flex-1 truncate text-ink-soft">${escapeHtml(it.label)}</span>
              <span class="text-xs text-ink-mute tabular">${numDe(pct, pct < 10 ? 1 : 0)} %</span>
              <span class="w-[5.5rem] text-right font-medium tabular">${money(it.value * f)}</span>
            </div>
            <div class="ml-[1.125rem] mt-1.5 h-1 overflow-hidden rounded-full bg-paper">
              <div class="bar h-full rounded-full" ${barAttr(`d.lg.${dim}.${it.key}`, pct, `background:${it.color}`)}></div>
            </div>
          </li>`;
      }).join("")
    : `<li class="py-8 text-center text-sm text-ink-mute">Keine Ersparnisse für diese Auswahl.</li>`;

  if (!window.Chart) return;
  upsertChart("donutChart", {
    type: "doughnut",
    data: {
      labels: items.length ? items.map(i => i.label) : ["Keine Daten"],
      datasets: [{
        data: items.length ? items.map(i => round2(i.value * f)) : [1],
        backgroundColor: items.length ? items.map(i => i.color) : ["#EEF2EF"],
        borderColor: "#ffffff", borderWidth: 2, hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "74%",
      animation: REDUCED_MOTION ? false : { animateRotate: true, animateScale: false, duration: 950, easing: "easeOutQuart" },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: items.length > 0, backgroundColor: "#1B201D", padding: 10, cornerRadius: 10,
          callbacks: { label: ctx => ` ${ctx.label}: ${money(ctx.parsed)}` },
        },
      },
    },
  });
}

function renderPersonCard(d) {
  const f = state.view.value === "gross" ? grossFactor() : 1;
  const sums = { A: 0, B: 0, both: 0 };
  const counts = { A: 0, B: 0, both: 0 };
  for (const e of d.entries) { sums[e.person] += e.amount; counts[e.person] += e.qty; }
  const total = sums.A + sums.B + sums.both;

  const tile = p => `
    <div class="min-w-0 rounded-2xl bg-paper p-3">
      <div class="flex items-center gap-2">${avatar(p, "avatar-md")}<span class="truncate text-sm font-medium">${escapeHtml(personName(p))}</span></div>
      <p class="mt-2 text-xl font-semibold tracking-tight tabular">${countSpan(`d.person.${p}`, sums[p] * f)}</p>
      <p class="text-xs text-ink-mute tabular">${counts[p]} ${counts[p] === 1 ? "Verzicht" : "Verzichte"}</p>
    </div>`;

  let body;
  if (state.view.source === "recurring") {
    body = `<p class="mt-4 text-sm text-ink-mute">Laufende Einsparungen gehören euch beiden. Wähle im Filter „Alles“ oder „Nur aktiv“, um die Aufteilung zu sehen.</p>`;
  } else if (!(total > 0)) {
    body = `<p class="mt-4 text-sm text-ink-mute">Keine aktiven Verzichte für diese Auswahl.</p>`;
  } else {
    body = `
      <div class="mt-4 grid grid-cols-2 gap-2">${tile("A")}${tile("B")}</div>
      ${personSplitHtml("d.personSplit", sums, { legend: false })}
      ${sums.both > 0 ? `<p class="mt-2 flex items-center gap-1.5 text-xs text-ink-mute">${avatar("both")}Gemeinsam <b class="font-semibold text-ink tabular">${money(sums.both * f)}</b>, ${counts.both} ${counts.both === 1 ? "Verzicht" : "Verzichte"}</p>` : ""}`;
  }

  $("#personCard").innerHTML = `
    <h3 class="text-sm font-semibold">Wer hat verzichtet?</h3>
    <p class="mt-0.5 text-xs text-ink-mute">Aktive Verzichte im gewählten Zeitraum, ${state.view.value === "gross" ? "brutto" : "netto"}</p>
    ${body}`;
}

function renderRecurringCard() {
  const s = state.settings;
  const f = s.grossFactor;
  const active = activeRecurring().sort((a, b) => b.amount - a.amount);
  const paused = s.recurring.length - active.length;
  const monthly = sum(active.map(r => r.amount));
  const top = active.slice(0, 5);

  $("#recurringCard").innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold">Laufende Einsparungen</h3>
        <p class="mt-0.5 text-xs text-ink-mute">${active.length} aktiv${paused ? `, ${paused} pausiert` : ""}, tagesgenau hochgerechnet</p>
      </div>
      <button type="button" class="btn-quiet shrink-0" data-action="open-settings" data-section="settings-recurring"><i class="fa-solid fa-pen text-xs"></i> Bearbeiten</button>
    </div>
    <div class="mt-4 grid grid-cols-3 gap-2 text-center">
      <div class="rounded-2xl bg-paper px-2 py-3"><p class="text-xs text-ink-mute">pro Monat</p><p class="mt-0.5 font-semibold tabular">${countSpan("d.rec.month", monthly)}</p></div>
      <div class="rounded-2xl bg-paper px-2 py-3"><p class="text-xs text-ink-mute">pro Jahr</p><p class="mt-0.5 font-semibold tabular">${countSpan("d.rec.year", monthly * 12)}</p></div>
      <div class="rounded-2xl bg-jade-50 px-2 py-3"><p class="text-xs text-jade-700">brutto / Jahr</p><p class="mt-0.5 font-semibold text-jade-700 tabular">${countSpan("d.rec.gross", monthly * 12 * f)}</p></div>
    </div>
    ${monthly > 0 ? `
      <div class="mt-4 flex h-2.5 gap-px overflow-hidden rounded-full bg-paper">
        ${active.map(r => `<div class="bar h-full" title="${escapeHtml(r.label)}: ${money(r.amount)}" ${barAttr(`d.rec.seg.${r.id}`, (r.amount / monthly) * 100, `background:${CATEGORIES[r.category].color}`)}></div>`).join("")}
      </div>
      <ul class="mt-3 space-y-1.5">
        ${top.map(r => `
          <li class="flex items-center gap-2.5 text-sm">
            <i class="fa-solid ${r.icon} w-4 text-center text-xs" style="color:${CATEGORIES[r.category].color}"></i>
            <span class="min-w-0 flex-1 truncate text-ink-soft">${escapeHtml(r.label)}</span>
            <span class="font-medium tabular">${money(r.amount)}</span>
          </li>`).join("")}
      </ul>
      ${active.length > top.length ? `<p class="mt-2 text-xs text-ink-mute">und ${active.length - top.length} weitere</p>` : ""}`
    : `<p class="mt-4 text-sm text-ink-mute">Keine laufende Einsparung aktiv. Unter „Bearbeiten“ kannst du welche einschalten.</p>`}`;
}

function renderBadges() {
  const list = badgeList();
  const done = list.filter(b => b.done).length;
  const fresh = state.ui.freshBadges;
  $("#badgesCard").innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold">Abzeichen</h3>
        <p class="mt-0.5 text-xs text-ink-mute">Belohnen Gewohnheiten, nicht nur Beträge. Tippen für Details.</p>
      </div>
      <span class="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold tabular">${done} von ${list.length}</span>
    </div>
    <div class="mt-4 grid grid-cols-4 gap-1">
      ${list.map(b => `
        <button type="button" data-action="badge" data-id="${b.id}" class="flex flex-col items-center gap-1.5 rounded-2xl p-2 text-center transition hover:bg-paper" aria-label="${escapeHtml(b.name)}${b.done ? " (freigeschaltet)" : ""}">
          <span class="grid h-12 w-12 place-items-center rounded-full ${b.done ? "badge-on bg-jade-500 text-white" : "bg-paper text-[#C3CBC6]"}${fresh.has(b.id) ? " badge-pop" : ""}"><i class="fa-solid ${b.icon}"></i></span>
          <span class="text-[11px] font-medium leading-tight ${b.done ? "text-ink" : "text-ink-mute"}">${escapeHtml(b.name)}</span>
          ${b.done ? "" : `<span class="block h-1 w-9 overflow-hidden rounded-full bg-paper"><span class="bar block h-full rounded-full bg-jade-400" ${barAttr(`d.badge.${b.id}`, b.pct)}></span></span>`}
        </button>`).join("")}
    </div>`;
  fresh.clear();
}


/* ═══════════════════════════════════════════════════════════════════════════
   11 · RENDERING: Historie
   ═══════════════════════════════════════════════════════════════════════════ */

function entryRow(e) {
  const c = CATEGORIES[e.category];
  const p = partsOf(e.dn);
  return `
    <li class="flex items-center gap-3 rounded-2xl border border-mist bg-white px-3 py-2.5">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style="background:${hexA(c.color, 0.12)};color:${c.color}"><i class="fa-solid ${c.icon} text-sm"></i></span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium">${escapeHtml(e.title)}${e.qty > 1 ? ` <span class="font-normal text-ink-mute">×${e.qty}</span>` : ""}</p>
        <p class="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-mute">
          <span class="shrink-0">${WEEKDAYS[p.wd]}., ${pad(p.d)}.${pad(p.m)}.</span>
          ${avatar(e.person)}<span class="truncate">${escapeHtml(personName(e.person))}</span>
          ${e.quickId ? `<i class="fa-solid fa-bolt shrink-0 text-[10px] text-jade-500" title="Schnellerfassung"></i>` : ""}
        </p>
      </div>
      <div class="shrink-0 text-right">
        <p class="text-sm font-semibold text-jade-700 tabular">+${moneyExact(e.amount)}</p>
        <p class="text-[11px] text-ink-mute tabular">${money(e.amount * grossFactor())} brutto</p>
      </div>
      <button type="button" data-action="delete" data-id="${escapeHtml(e.id)}" class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#A3ABA6] transition hover:bg-rose-50 hover:text-rose-600" aria-label="„${escapeHtml(e.title)}“ löschen">
        <i class="fa-solid fa-trash-can text-sm"></i>
      </button>
    </li>`;
}

function renderHistory() {
  if (state.tab !== "history") return;
  const q = state.ui.historyQuery.trim().toLowerCase();
  const list = q
    ? state.entries.filter(e => `${e.title} ${CATEGORIES[e.category].label} ${personName(e.person)}`.toLowerCase().includes(q))
    : state.entries;
  const total = sum(list.map(e => e.amount));
  $("#historySummary").textContent = list.length
    ? `${list.length} ${list.length === 1 ? "Eintrag" : "Einträge"}, zusammen ${money(total)} netto und ${money(total * grossFactor())} brutto`
    : "";

  if (!state.entries.length) {
    $("#historyList").innerHTML = `
      <div class="rounded-[1.25rem] border border-dashed border-mist bg-white px-6 py-10 text-center">
        <span class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-jade-50 text-jade-600"><i class="fa-solid fa-seedling"></i></span>
        <p class="mt-3 text-sm font-medium">Noch keine Einträge</p>
        <p class="mt-1 text-xs text-ink-mute">Der nächste Kaffee, den ihr nicht kauft, ist der erste.</p>
        <button type="button" data-action="tab" data-tab="tracker" class="btn-primary mt-5 px-5"><i class="fa-solid fa-bolt"></i> Zum Tracker</button>
      </div>`;
    return;
  }
  if (!list.length) {
    $("#historyList").innerHTML = `<p class="py-10 text-center text-sm text-ink-mute">Keine Treffer für „${escapeHtml(state.ui.historyQuery)}“.</p>`;
    return;
  }

  const groups = [];
  for (const e of list) {
    const key = e.date.slice(0, 7);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) { g = { key, items: [] }; groups.push(g); }
    g.items.push(e);
  }
  $("#historyList").innerHTML = groups.map(g => {
    const [y, m] = g.key.split("-").map(Number);
    return `
      <section>
        <div class="sticky z-10 -mx-4 flex items-baseline justify-between bg-paper/90 px-4 py-2 backdrop-blur" style="top: calc(3.5rem + env(safe-area-inset-top));">
          <h3 class="text-sm font-semibold">${MONTHS[m - 1]} ${y}</h3>
          <p class="text-xs text-ink-mute tabular">${sum(g.items.map(e => e.qty))}× <b class="ml-1 font-semibold text-ink">${money(sum(g.items.map(e => e.amount)))}</b></p>
        </div>
        <ul class="mt-1 space-y-2">${g.items.map(entryRow).join("")}</ul>
      </section>`;
  }).join("");
}


/* ═══════════════════════════════════════════════════════════════════════════
   12 · FENSTER (Bottom Sheets): Schnellerfassung & Einstellungen
   ═══════════════════════════════════════════════════════════════════════════ */

function isSheetOpen(id) {
  const el = document.getElementById(id);
  return Boolean(el) && !el.classList.contains("hidden") && el.dataset.state !== "closing";
}

function openSheet(id) {
  const sheet = document.getElementById(id);
  clearTimeout(sheetTimers[id]);
  sheet.dataset.state = "open";
  sheet.classList.remove("hidden");
  document.documentElement.classList.add("overflow-hidden");
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (sheet.dataset.state !== "open") return;
    $(".backdrop", sheet).classList.add("open");
    $(".sheet", sheet).classList.add("open");
  }));
}

function closeSheet(id) {
  if (!isSheetOpen(id)) return;
  const sheet = document.getElementById(id);
  if (sheet.contains(document.activeElement)) document.activeElement.blur(); // löst offene „change“-Events aus
  sheet.dataset.state = "closing";
  $(".backdrop", sheet).classList.remove("open");
  $(".sheet", sheet).classList.remove("open");
  if (!["quickSheet", "settingsSheet"].some(other => other !== id && isSheetOpen(other))) {
    document.documentElement.classList.remove("overflow-hidden");
  }
  sheetTimers[id] = setTimeout(() => {
    sheet.classList.add("hidden");
    sheet.dataset.state = "closed";
  }, 340);
}

/* ── Schnellerfassung ── */
function currentQuick() { return QUICK_ACTIONS.find(x => x.id === quickDraft.qid) || null; }

function openQuick(id, tile) {
  if (!QUICK_ACTIONS.some(x => x.id === id)) return;
  const remembered = lastQuickDate.date && Date.now() - lastQuickDate.at < QUICK_DATE_MEMORY_MS && lastQuickDate.date <= todayStr();
  Object.assign(quickDraft, { qid: id, qty: 1, tile, date: remembered ? lastQuickDate.date : todayStr() });
  renderQuickSheet();
  openSheet("quickSheet");
  setTimeout(() => { if (isSheetOpen("quickSheet")) $("#quickSave")?.focus({ preventScroll: true }); }, 360);
}

function renderQuickSheet() {
  const q = currentQuick();
  if (!q) return;
  const t = todayDn();
  $("#quickBody").innerHTML = `
    <form id="quickForm" novalidate>
      <div class="flex items-center gap-4">
        <span class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-jade-50 text-3xl" aria-hidden="true">${q.emoji}</span>
        <div class="min-w-0 flex-1">
          <h2 id="quickTitle" class="truncate text-lg font-semibold">${escapeHtml(q.title)}</h2>
          <p class="text-sm text-ink-mute tabular">${money(q.amount)} je Verzicht, ${money(q.amount * grossFactor())} brutto</p>
        </div>
        <button type="button" data-action="close-sheet" data-sheet="quickSheet" class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper text-ink-soft" aria-label="Schließen">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <fieldset class="mt-6">
        <legend class="text-sm font-semibold">Wann?</legend>
        <div class="mt-2 grid grid-cols-3 gap-2">
          ${["Heute", "Gestern", "Vorgestern"].map((label, off) => `
            <button type="button" class="chip chip-range justify-center" data-action="quick-date" data-value="${fromDn(t - off)}">${label}</button>`).join("")}
        </div>
        <label class="relative mt-2 block">
          <span class="sr-only">Anderes Datum wählen</span>
          <i class="fa-regular fa-calendar pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-mute"></i>
          <input id="quickDate" type="date" class="input pl-10" max="${fromDn(t)}" value="${quickDraft.date}">
        </label>
      </fieldset>

      <div class="mt-5 flex items-center justify-between gap-3">
        <p id="qtyLabel" class="text-sm font-semibold">Wie oft?</p>
        <div class="flex items-center gap-1 rounded-full bg-paper p-1" role="group" aria-labelledby="qtyLabel">
          <button type="button" class="stepper" data-action="quick-qty" data-value="-1" aria-label="Einmal weniger"><i class="fa-solid fa-minus"></i></button>
          <output id="quickQty" class="w-10 text-center text-base font-semibold tabular" aria-live="polite">1</output>
          <button type="button" class="stepper" data-action="quick-qty" data-value="1" aria-label="Einmal mehr"><i class="fa-solid fa-plus"></i></button>
        </div>
      </div>

      <div class="mt-5">
        <p class="text-sm font-semibold">Wer?</p>
        <div class="mt-2 grid grid-cols-3 gap-2">
          ${PERSONS.map(p => `
            <button type="button" class="chip chip-person min-w-0 justify-center" data-action="quick-person" data-value="${p}" style="--pc:${PERSON_COLORS[p]};--pcd:${PERSON_DARK[p]}">
              ${avatar(p)}<span class="truncate">${escapeHtml(personName(p))}</span>
            </button>`).join("")}
        </div>
      </div>

      <p id="quickSummary" class="mt-6 text-center text-sm text-ink-soft"></p>
      <button id="quickSave" type="submit" class="btn-primary mt-3 w-full"></button>
    </form>`;
  updateQuickSheet();
}

/* Aktualisiert nur die veränderlichen Teile – so bleibt das Datumsfeld beim Tippen bedienbar */
function updateQuickSheet() {
  const q = currentQuick();
  const body = $("#quickBody");
  if (!q || !$("#quickForm", body)) return;
  const date = quickDraft.date;
  const valid = isValidDateStr(date) && date <= todayStr();

  $$("[data-action='quick-date']", body).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.value === date)));
  const input = $("#quickDate", body);
  if (input && document.activeElement !== input && input.value !== date) input.value = date;
  $$("[data-action='quick-person']", body).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.value === state.person)));
  $("#quickQty", body).textContent = String(quickDraft.qty);
  $("[data-action='quick-qty'][data-value='-1']", body).disabled = quickDraft.qty <= 1;
  $("[data-action='quick-qty'][data-value='1']", body).disabled = quickDraft.qty >= MAX_QTY;

  const total = q.amount * quickDraft.qty;
  const what = `${quickDraft.qty > 1 ? `${quickDraft.qty}× ` : ""}${q.title}`;
  $("#quickSummary", body).innerHTML = valid
    ? `<b class="font-semibold text-ink">${escapeHtml(what)}</b>, ${escapeHtml(relDayLabel(date))}, ${escapeHtml(whoLabel(state.person))}`
    : `<span class="text-rose-600">Wähle ein Datum, das nicht in der Zukunft liegt.</span>`;
  const save = $("#quickSave", body);
  save.disabled = !valid;
  save.innerHTML = `<i class="fa-solid fa-check"></i> ${money(total)} speichern`;
}

function saveQuick() {
  const q = currentQuick();
  if (!q || !isSheetOpen("quickSheet")) return;
  const date = quickDraft.date;
  if (!isValidDateStr(date) || date > todayStr()) { updateQuickSheet(); return; }
  const qty = quickDraft.qty;
  addEntry({ title: q.title, amount: q.amount * qty, qty, category: q.category, date, person: state.person, quickId: q.id });
  lastQuickDate = date === todayStr() ? { date: null, at: 0 } : { date, at: Date.now() };
  const tile = quickDraft.tile;
  closeSheet("quickSheet");
  if (tile && document.body.contains(tile)) tile.focus({ preventScroll: true });
  setTimeout(() => celebrateTile(tile, q.amount * qty), 140);
  if (navigator.vibrate) navigator.vibrate(12);
}

/* Bestätigung auf der Kachel: Häkchen + aufsteigender Betrag */
function celebrateTile(tile, amount) {
  if (!tile || !document.body.contains(tile)) return;
  tile.classList.remove("qa-done");
  void tile.offsetWidth; // Animation neu starten
  tile.classList.add("qa-done");
  clearTimeout(tile.qaTimer);
  tile.qaTimer = setTimeout(() => tile.classList.remove("qa-done"), 1300);
  if (REDUCED_MOTION) return;
  const label = document.createElement("span");
  label.className = "float-amount tabular";
  label.setAttribute("aria-hidden", "true");
  label.textContent = `+${money(amount)}`;
  tile.appendChild(label);
  label.addEventListener("animationend", () => label.remove(), { once: true });
  setTimeout(() => label.remove(), 2000);
}

/* ── Einstellungen ── */
function categoryOptions(selected) {
  return CAT_KEYS.map(k => `<option value="${k}" ${k === selected ? "selected" : ""}>${escapeHtml(CATEGORIES[k].label)}</option>`).join("");
}

function recurringRow(r) {
  const c = CATEGORIES[r.category];
  const id = escapeHtml(r.id);
  return `
    <li class="py-3">
      <div class="flex items-center gap-2">
        <span data-rec-icon class="grid h-9 w-9 shrink-0 place-items-center rounded-xl ${r.active ? "" : "opacity-40"}" style="background:${hexA(c.color, 0.12)};color:${c.color}"><i class="fa-solid ${r.icon} text-sm"></i></span>
        <input class="input-inline min-w-0 flex-1" type="text" maxlength="60" data-rec="${id}" data-field="label" value="${escapeHtml(r.label)}" aria-label="Bezeichnung">
        <div class="relative w-24 shrink-0">
          <input class="input h-10 pr-7 text-right tabular" type="text" inputmode="decimal" data-rec="${id}" data-field="amount" value="${numDe(r.amount, 2)}" aria-label="Betrag pro Monat für ${escapeHtml(r.label)}">
          <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-mute">€</span>
        </div>
        <input type="checkbox" class="switch" data-rec="${id}" data-field="active" ${r.active ? "checked" : ""} aria-label="${escapeHtml(r.label)} aktiv">
      </div>
      <div class="mt-1.5 flex items-center gap-2 pl-11 text-xs text-ink-mute">
        <span class="truncate">${c.label}</span>
        <label class="ml-auto flex shrink-0 items-center gap-1.5">seit
          <input type="date" class="h-8 rounded-lg border border-mist bg-white px-2 text-xs text-ink" data-rec="${id}" data-field="since" value="${r.since}" max="${todayStr()}" aria-label="Aktiv seit">
        </label>
        <button type="button" data-action="delete-recurring" data-id="${id}" class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#A3ABA6] hover:bg-rose-50 hover:text-rose-600" aria-label="${escapeHtml(r.label)} entfernen"><i class="fa-solid fa-trash-can text-xs"></i></button>
      </div>
    </li>`;
}

function settingsSection(title, icon, body, id = "") {
  return `
    <section ${id ? `id="${id}"` : ""} class="border-t border-mist py-5 first:border-t-0 first:pt-1">
      <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold"><i class="fa-solid ${icon} text-jade-600"></i>${title}</h3>
      ${body}
    </section>`;
}

function renderSettings() {
  const s = state.settings;
  const recurringSum = sum(activeRecurring().map(r => r.amount));
  $("#settingsBody").innerHTML = `
    ${settingsSection("Haushalt", "fa-user-group", `
      <div class="grid grid-cols-2 gap-3">
        <label class="field-label">Person 1<input class="input mt-1" type="text" maxlength="24" data-setting="names.A" value="${escapeHtml(s.names.A)}"></label>
        <label class="field-label">Person 2<input class="input mt-1" type="text" maxlength="24" data-setting="names.B" value="${escapeHtml(s.names.B)}"></label>
      </div>
      <p class="field-hint">Erscheinen bei der Auswahl, in der Historie und im Dashboard.</p>`)}

    ${settingsSection("Berechnung", "fa-calculator", `
      <div class="grid grid-cols-2 gap-3">
        <label class="field-label">Brutto-Faktor
          <input class="input mt-1 tabular" type="text" inputmode="decimal" data-setting="grossFactor" value="${numDe(s.grossFactor, 2)}">
          <span id="taxHint" class="field-hint">rund ${Math.round((1 - 1 / s.grossFactor) * 100)} % Abgabenlast</span>
        </label>
        <label class="field-label">Monatsziel aktiv
          <input class="input mt-1 tabular" type="text" inputmode="decimal" data-setting="monthlyGoal" value="${numDe(s.monthlyGoal, 2)}">
          <span class="field-hint">in €, 0 blendet das Ziel aus</span>
        </label>
        <label class="field-label">Brutto-Stundenlohn
          <input class="input mt-1 tabular" type="text" inputmode="decimal" data-setting="hourlyWage" value="${s.hourlyWage ? numDe(s.hourlyWage, 2) : ""}" placeholder="optional">
          <span class="field-hint">zeigt Arbeitsstunden an</span>
        </label>
        <label class="field-label">Zählbeginn
          <input class="input mt-1" type="date" data-setting="trackingStart" value="${s.trackingStart}" max="${todayStr()}">
          <span class="field-hint">Start für laufende Posten</span>
        </label>
      </div>`)}

    ${settingsSection("Laufende Einsparungen", "fa-arrows-rotate", `
      <div class="flex items-baseline justify-between gap-3">
        <p class="text-xs text-ink-mute">Beträge pro Monat. Ohne „seit“-Datum gilt der Zählbeginn.</p>
        <p id="recurringSum" class="shrink-0 text-sm font-semibold text-jade-700 tabular">${money(recurringSum)} / Monat</p>
      </div>
      <ul id="recurringList" class="mt-1 divide-y divide-mist">${s.recurring.map(recurringRow).join("")}</ul>
      <div class="mt-3 rounded-2xl border border-dashed border-[#C9D2CD] p-3">
        <p class="mb-2 text-xs font-semibold text-ink-soft">Eigene laufende Einsparung hinzufügen</p>
        <div class="grid grid-cols-[1fr_6.5rem] gap-2">
          <input id="newRecLabel" class="input" type="text" maxlength="60" placeholder="z. B. Kein Fitnessstudio">
          <input id="newRecAmount" class="input text-right tabular" type="text" inputmode="decimal" placeholder="€ / Monat">
        </div>
        <div class="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <select id="newRecCategory" class="input">${categoryOptions("sonstiges")}</select>
          <button type="button" data-action="add-recurring" class="btn-primary h-11 px-4">Hinzufügen</button>
        </div>
        <p id="newRecError" class="mt-2 hidden text-xs text-rose-600" role="alert"></p>
      </div>
      <button type="button" data-action="reset-recurring" class="mt-3 text-xs font-medium text-ink-mute hover:text-ink"><i class="fa-solid fa-rotate-left mr-1"></i>Standardliste wiederherstellen</button>`, "settings-recurring")}

    ${settingsSection("Daten", "fa-database", `
      <div class="rounded-2xl bg-paper p-3 text-sm text-ink-soft">
        ${state.mode === "firebase"
          ? `<i class="fa-solid fa-cloud mr-2 text-jade-600"></i>Firebase, Haushalt „${escapeHtml(HOUSEHOLD_ID)}“`
          : `<i class="fa-solid fa-laptop mr-2 text-amber-500"></i>Lokaler Demo-Modus (nur dieser Browser)`}
      </div>
      <button type="button" data-action="export-csv" class="btn-quiet mt-3 w-full justify-center"><i class="fa-solid fa-file-csv"></i> Einträge als CSV exportieren</button>`)}`;
}

function rerenderRecurringList() {
  const list = $("#recurringList");
  if (list) list.innerHTML = state.settings.recurring.map(recurringRow).join("");
  refreshSettingsSummary();
}

function refreshSettingsSummary() {
  const el = $("#recurringSum");
  if (el) el.textContent = `${money(sum(activeRecurring().map(r => r.amount)))} / Monat`;
}

function openSettings(sectionId) {
  renderSettings();
  openSheet("settingsSheet");
  $("#settingsBody").scrollTop = 0;
  if (sectionId) {
    setTimeout(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "start" }), 360);
  }
}

function closeSettings() {
  if (!isSheetOpen("settingsSheet")) return;
  closeSheet("settingsSheet"); // blur zuerst, damit die letzte Eingabe übernommen wird
  flushSettings();
}

function persistSettings() {
  clearTimeout(settingsSaveTimer);
  settingsSaveTimer = setTimeout(() => {
    settingsSaveTimer = null;
    store.saveSettings(serializeSettings(state.settings)).catch(err => toastError("Einstellungen wurden nicht gespeichert", err));
  }, 350);
  refreshViews();
  checkAchievements();
}

function flushSettings() {
  if (!settingsSaveTimer) return;
  clearTimeout(settingsSaveTimer);
  settingsSaveTimer = null;
  store.saveSettings(serializeSettings(state.settings)).catch(err => toastError("Einstellungen wurden nicht gespeichert", err));
}

function onSettingsChange(e) {
  const t = e.target;
  const s = state.settings;

  if (t.dataset.setting) {
    const key = t.dataset.setting;
    if (key === "names.A" || key === "names.B") {
      const p = key.slice(-1);
      s.names[p] = cleanName(t.value, DEFAULT_NAMES[p]);
      t.value = s.names[p];
    } else if (key === "trackingStart") {
      if (isValidDateStr(t.value) && t.value <= todayStr()) s.trackingStart = t.value;
      else t.value = s.trackingStart;
    } else {
      const limits = { grossFactor: [1, 5], monthlyGoal: [0, 1e6], hourlyWage: [0, 1e4] }[key];
      if (!limits) return;
      let n = t.value.trim() === "" && key !== "grossFactor" ? 0 : parseAmount(t.value);
      if (!Number.isFinite(n)) n = s[key];
      s[key] = round2(Math.min(limits[1], Math.max(limits[0], n)));
      t.value = key === "hourlyWage" && !s[key] ? "" : numDe(s[key], 2);
      if (key === "grossFactor") $("#taxHint").textContent = `rund ${Math.round((1 - 1 / s.grossFactor) * 100)} % Abgabenlast`;
    }
    persistSettings();
    return;
  }

  if (t.dataset.rec) {
    const r = s.recurring.find(x => x.id === t.dataset.rec);
    if (!r) return;
    switch (t.dataset.field) {
      case "label": {
        const v = t.value.trim().slice(0, 60);
        if (v) r.label = v;
        t.value = r.label;
        break;
      }
      case "amount": {
        const n = parseAmount(t.value);
        if (Number.isFinite(n) && n >= 0) r.amount = round2(Math.min(n, 1e6));
        t.value = numDe(r.amount, 2);
        break;
      }
      case "active":
        r.active = t.checked;
        t.closest("li")?.querySelector("[data-rec-icon]")?.classList.toggle("opacity-40", !r.active);
        break;
      case "since":
        r.since = isValidDateStr(t.value) && t.value <= todayStr() ? t.value : "";
        t.value = r.since;
        break;
      default:
        return;
    }
    refreshSettingsSummary();
    persistSettings();
  }
}

function addRecurring() {
  const label = $("#newRecLabel").value.trim();
  const amount = parseAmount($("#newRecAmount").value);
  const category = $("#newRecCategory").value;
  const err = $("#newRecError");
  if (!label || !(amount > 0)) {
    err.textContent = "Bitte Bezeichnung und einen Betrag pro Monat angeben.";
    err.classList.remove("hidden");
    return;
  }
  err.classList.add("hidden");
  const cat = CATEGORIES[category] ? category : "sonstiges";
  state.settings.recurring.push({
    id: `c-${uid()}`, label: label.slice(0, 60), amount: round2(Math.min(amount, 1e6)),
    category: cat, icon: CATEGORIES[cat].icon, active: true, since: "",
  });
  $("#newRecLabel").value = "";
  $("#newRecAmount").value = "";
  rerenderRecurringList();
  persistSettings();
  toast({ icon: "fa-plus", title: "Laufende Einsparung hinzugefügt", text: `${label}: ${money(amount)} pro Monat` });
}

function deleteRecurring(id) {
  const list = state.settings.recurring;
  const idx = list.findIndex(r => r.id === id);
  if (idx < 0) return;
  const [removed] = list.splice(idx, 1);
  rerenderRecurringList();
  persistSettings();
  toast({
    icon: "fa-trash-can", title: "Laufende Einsparung entfernt", text: removed.label,
    action: {
      label: "Rückgängig",
      run: () => {
        state.settings.recurring.splice(Math.min(idx, state.settings.recurring.length), 0, removed);
        rerenderRecurringList();
        persistSettings();
      },
    },
  });
}

function resetRecurring() {
  if (!window.confirm("Alle laufenden Einsparungen auf die Standardliste zurücksetzen? Eigene Posten gehen dabei verloren.")) return;
  state.settings.recurring = DEFAULT_RECURRING.map(r => ({ ...r, active: true, since: "" }));
  rerenderRecurringList();
  persistSettings();
  toast({ icon: "fa-rotate-left", title: "Standardliste wiederhergestellt" });
}

function exportCsv() {
  const f = grossFactor();
  const dec = v => (round2(v) || 0).toFixed(2).replace(".", ",");
  const cell = v => {
    let s = String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [["Datum", "Titel", "Anzahl", "Kategorie", "Person", "Netto (EUR)", "Brutto-Äquivalent (EUR)"]];
  for (const e of state.entries) rows.push([e.date, e.title, e.qty, CATEGORIES[e.category].label, personName(e.person), dec(e.amount), dec(e.amount * f)]);
  const blob = new Blob([`\ufeff${rows.map(r => r.map(cell).join(";")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: `shadowwealth-${todayStr()}.csv` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast({ icon: "fa-file-csv", title: "CSV exportiert", text: `${state.entries.length} Einträge` });
}


/* ═══════════════════════════════════════════════════════════════════════════
   13 · AKTIONEN, TOASTS & GAMIFICATION
   ═══════════════════════════════════════════════════════════════════════════ */

function toast({ icon = "fa-circle-check", title = "", text = "", tone = "default", action = null, duration = 4200 }) {
  const stack = $("#toastStack");
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.className = `toast${tone === "reward" ? " toast-reward" : ""} pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-2xl ring-1 ring-white/10`;
  const iconClass = tone === "error" ? "bg-rose-500/20 text-rose-300"
    : tone === "reward" ? "bg-jade-400 text-ink"
    : "bg-jade-500/20 text-jade-300";
  el.innerHTML = `
    <span class="toast-icon grid h-9 w-9 shrink-0 place-items-center rounded-full ${iconClass}"><i class="fa-solid ${icon}"></i></span>
    <div class="min-w-0 flex-1">
      ${title ? `<p class="truncate text-sm font-semibold">${escapeHtml(title)}</p>` : ""}
      ${text ? `<p class="line-clamp-2 text-xs text-white/65">${escapeHtml(text)}</p>` : ""}
    </div>
    ${action ? `<button type="button" class="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-jade-300 hover:bg-white/10">${escapeHtml(action.label)}</button>` : ""}`;
  let timer = null;
  const dismiss = () => {
    clearTimeout(timer);
    el.classList.add("out");
    setTimeout(() => el.remove(), 220);
  };
  if (action) el.querySelector("button").addEventListener("click", () => { action.run(); dismiss(); }, { once: true });
  stack.appendChild(el);
  while (stack.children.length > 3) stack.firstElementChild.remove();
  timer = setTimeout(dismiss, action ? Math.max(duration, 6000) : duration);
}

function toastError(title, err) {
  console.error(title, err);
  toast({
    icon: "fa-triangle-exclamation", tone: "error", title,
    text: err?.code === "permission-denied" ? "Keine Berechtigung. Prüfe die Firestore-Sicherheitsregeln." : (err?.message || "Unbekannter Fehler"),
  });
}

function addEntry(data) {
  const payload = {
    title: String(data.title).slice(0, 80),
    amount: round2(data.amount),
    qty: clampQty(data.qty),
    category: CATEGORIES[data.category] ? data.category : "sonstiges",
    date: data.date,
    person: PERSONS.includes(data.person) ? data.person : "both",
    quickId: data.quickId ?? null,
    createdAt: Date.now(),
  };
  const pending = store.add(payload);
  pending.catch(err => toastError("Speichern fehlgeschlagen", err));
  const what = `${payload.qty > 1 ? `${payload.qty}× ` : ""}${payload.title}`;
  toast({
    icon: "fa-circle-check",
    title: `+${money(payload.amount)} gespart`,
    text: `${what}, ${relDayLabel(payload.date)}, ${whoLabel(payload.person)}`,
    action: {
      label: "Rückgängig",
      run: () => pending.then(id => store.remove(id)).catch(err => toastError("Rückgängig fehlgeschlagen", err)),
    },
  });
}

function deleteEntry(id) {
  const entry = state.entries.find(e => e.id === id);
  if (!entry) return;
  const data = toStored(entry);
  store.remove(id).catch(err => toastError("Löschen fehlgeschlagen", err));
  toast({
    icon: "fa-trash-can",
    title: "Eintrag gelöscht",
    text: `${entry.qty > 1 ? `${entry.qty}× ` : ""}${entry.title}, ${moneyExact(entry.amount)}`,
    action: { label: "Rückgängig", run: () => store.restore(id, data).catch(err => toastError("Wiederherstellen fehlgeschlagen", err)) },
  });
}

function showBadge(id) {
  const b = badgeList().find(x => x.id === id);
  if (!b) return;
  const progress = b.money ? `${money(Math.min(b.val, b.target))} von ${money(b.target)}` : `${Math.min(b.val, b.target)} von ${b.target}`;
  toast({
    icon: b.icon, tone: b.done ? "reward" : "default",
    title: b.done ? `${b.name}: freigeschaltet` : b.name,
    text: `${b.desc}${b.done ? "" : ` Stand: ${progress}.`}`,
  });
}

/* Neue Abzeichen/Stufen dezent melden (pro Gerät gemerkt, ohne Flut beim ersten Start) */
function checkAchievements() {
  if (!state.entriesLoaded || !state.settingsLoaded) return;
  const unlocked = badgeList().filter(b => b.done).map(b => b.id);
  const seen = lsGet(nsKey("seenBadges"), null);
  if (!Array.isArray(seen)) {
    lsSet(nsKey("seenBadges"), unlocked);
  } else {
    const fresh = unlocked.filter(id => !seen.includes(id));
    if (fresh.length === 1) {
      const b = BADGES.find(x => x.id === fresh[0]);
      toast({ icon: b.icon, tone: "reward", title: `Neues Abzeichen: ${b.name}`, text: b.desc, duration: 5500 });
    } else if (fresh.length > 1) {
      toast({ icon: "fa-trophy", tone: "reward", title: `${fresh.length} neue Abzeichen`, text: fresh.map(id => BADGES.find(x => x.id === id).name).join(", "), duration: 5500 });
    }
    if (fresh.length) {
      fresh.forEach(id => state.ui.freshBadges.add(id));
      lsSet(nsKey("seenBadges"), [...new Set([...seen, ...unlocked])]);
    }
  }

  const level = levelInfo(allTimeNet()).idx;
  const seenLevel = lsGet(nsKey("seenLevel"), null);
  if (typeof seenLevel !== "number" || level < seenLevel) {
    lsSet(nsKey("seenLevel"), level);
  } else if (level > seenLevel) {
    lsSet(nsKey("seenLevel"), level);
    state.ui.levelUp = true;
    toast({ icon: LEVELS[level].icon, tone: "reward", title: `Stufe ${level + 1} erreicht: ${LEVELS[level].name}`, text: `Euer Schattenvermögen liegt jetzt über ${money(LEVELS[level].min)}.`, duration: 5500 });
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   14 · NAVIGATION, ANSICHT & EVENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function refreshViews() {
  renderTracker();
  if (state.tab === "dashboard") renderDashboard();
  if (state.tab === "history") renderHistory();
}

function switchTab(tab, { scroll = true } = {}) {
  if (!TABS.includes(tab)) return;
  const changed = state.tab !== tab;
  const initial = state.tab === null;
  state.tab = tab;

  $$("[data-tab-panel]").forEach(p => p.classList.toggle("hidden", p.dataset.tabPanel !== tab));
  $$("nav [data-action='tab']").forEach(b => {
    if (b.dataset.tab === tab) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  $("#navIndicator").style.transform = `translateX(${TABS.indexOf(tab) * 100}%)`;

  if (changed && !initial) {
    const panel = $(`[data-tab-panel="${tab}"]`);
    panel.classList.remove("panel-enter");
    void panel.offsetWidth;
    panel.classList.add("panel-enter");
  }

  // Beim Öffnen eines Tabs laufen Zahlen und Balken einmal von null hoch
  if (changed && tab === "tracker") { resetAnim("t."); renderTracker(); }
  if (tab === "dashboard") {
    if (changed) { resetAnim("d."); destroyCharts(); }
    renderDashboard();
  }
  if (tab === "history") renderHistory();
  if (scroll) window.scrollTo({ top: 0 });
  try { history.replaceState(null, "", `#${tab}`); } catch { /* ignorieren */ }
}

function setView(key, value) {
  const v = state.view;
  if (VIEW_OPTIONS[key]) {
    if (!VIEW_OPTIONS[key].some(([k]) => k === value)) return;
    if (key === "range" && value === "custom" && v.range !== "custom") {
      const r = resolveRange();
      v.from = fromDn(r.start);
      v.to = fromDn(r.end);
    }
    v[key] = value;
  } else if (key === "from" || key === "to") {
    if (!isValidDateStr(value)) return;
    v[key] = value;
  } else if (key === "cumulative") {
    v.cumulative = Boolean(value);
  } else {
    return;
  }
  saveView();
  renderDashboard();
}

function toggleInView(key, value) {
  const list = state.view[key];
  state.view[key] = list.includes(value) ? list.filter(x => x !== value) : [...list, value];
  saveView();
  renderDashboard();
}

function onClick(e) {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const { action, id, value } = el.dataset;
  switch (action) {
    case "tab": switchTab(el.dataset.tab); break;
    case "person": setPerson(value); break;
    case "quick": openQuick(id, el); break;
    case "quick-date":
      if (isValidDateStr(value)) { quickDraft.date = value; updateQuickSheet(); }
      break;
    case "quick-qty":
      quickDraft.qty = Math.min(MAX_QTY, Math.max(1, quickDraft.qty + Number(value)));
      updateQuickSheet();
      break;
    case "quick-person": setPerson(value); updateQuickSheet(); break;
    case "delete": deleteEntry(id); break;
    case "view": setView(el.dataset.key, value); break;
    case "toggle-cat": toggleInView("cats", value); break;
    case "toggle-person": toggleInView("persons", value); break;
    case "cats-all": state.view.cats = [...CAT_KEYS]; saveView(); renderDashboard(); break;
    case "cats-none": state.view.cats = []; saveView(); renderDashboard(); break;
    case "reset-filters":
      Object.assign(state.view, { source: "all", cats: [...CAT_KEYS], persons: [...PERSONS] });
      saveView();
      renderDashboard();
      break;
    case "toggle-filters": state.ui.filterOpen = !state.ui.filterOpen; renderFilterBar(); break;
    case "toggle-chart-config": state.ui.chartConfigOpen = !state.ui.chartConfigOpen; renderDashboard(); break;
    case "badge": showBadge(id); break;
    case "open-settings": openSettings(el.dataset.section); break;
    case "close-sheet":
      if (el.dataset.sheet === "settingsSheet") closeSettings();
      else closeSheet(el.dataset.sheet);
      break;
    case "add-recurring": addRecurring(); break;
    case "delete-recurring": deleteRecurring(id); break;
    case "reset-recurring": resetRecurring(); break;
    case "export-csv": exportCsv(); break;
    case "dismiss-demo": lsSet("sw.hideDemoBanner", true); renderBanner(); break;
    case "dismiss-error": state.error = null; renderBanner(); renderStatus(); break;
    default: break;
  }
}

function onQuickDateInput(t) {
  quickDraft.date = t.value;
  updateQuickSheet();
}

function onChange(e) {
  const t = e.target;
  if (t.closest("#settingsBody")) return; // eigener Handler
  if (t.id === "quickDate") { onQuickDateInput(t); return; }
  if (t.dataset.viewInput) setView(t.dataset.viewInput, t.value);
  if (t.dataset.viewToggle) setView(t.dataset.viewToggle, t.checked);
}

function showFormError(msg) {
  const el = $("#formError");
  el.textContent = msg;
  el.classList.toggle("hidden", !msg);
}

function resetFormDate() {
  const input = $("#fDate");
  input.value = todayStr();
  input.max = todayStr();
}

function setupForm() {
  $("#fCategory").innerHTML = categoryOptions("sonstiges");
  resetFormDate();

  $("#fTitle").addEventListener("input", e => {
    const title = e.target.value.trim().toLowerCase();
    if (!title || $("#fAmount").value.trim()) return;
    const match = state.entries.find(x => x.title.toLowerCase() === title);
    if (match) {
      $("#fAmount").value = numDe(match.amount / match.qty, 2);
      $("#fCategory").value = match.category;
    }
  });

  $("#manualForm").addEventListener("submit", e => {
    e.preventDefault();
    const title = $("#fTitle").value.trim();
    const amount = parseAmount($("#fAmount").value);
    const date = $("#fDate").value;
    const category = $("#fCategory").value;
    const missing = [];
    if (!title) missing.push("einen Titel");
    if (!(amount > 0) || amount > 100000) missing.push("einen Betrag über 0 €");
    if (!isValidDateStr(date)) missing.push("ein Datum");
    if (missing.length) { showFormError(`Bitte gib ${joinDe(missing)} an.`); return; }
    if (date > todayStr()) { showFormError("Das Datum liegt in der Zukunft. Trag den Verzicht ein, wenn er passiert ist."); return; }
    showFormError("");
    addEntry({ title, amount, qty: 1, category, date, person: state.person });
    $("#fTitle").value = "";
    $("#fAmount").value = "";
    resetFormDate();
    document.activeElement?.blur();
  });
}

function checkDayChange() {
  const t = todayStr();
  if (t === lastDay) return;
  lastDay = t;
  resetFormDate();
  refreshViews();
  checkAchievements();
}

function bindEvents() {
  document.addEventListener("click", onClick);
  document.addEventListener("change", onChange);
  document.addEventListener("input", e => { if (e.target.id === "quickDate") onQuickDateInput(e.target); });
  document.addEventListener("submit", e => {
    if (e.target.id !== "quickForm") return;
    e.preventDefault();
    saveQuick();
  });
  $("#settingsBody").addEventListener("change", onSettingsChange);
  $("#historySearch").addEventListener("input", e => { state.ui.historyQuery = e.target.value; renderHistory(); });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (isSheetOpen("quickSheet")) closeSheet("quickSheet");
    else if (isSheetOpen("settingsSheet")) closeSettings();
  });
  window.addEventListener("pagehide", flushSettings);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) flushSettings();
    else checkDayChange();
  });
  setInterval(checkDayChange, 60000);
}


/* ═══════════════════════════════════════════════════════════════════════════
   15 · DATEN-EVENTS & START
   ═══════════════════════════════════════════════════════════════════════════ */

function onEntries(list, meta = {}) {
  const wasLoaded = state.entriesLoaded;
  state.online = !meta.fromCache;
  if (!meta.fromCache) state.entriesLoaded = true;
  if (meta.changed === false && wasLoaded) { renderStatus(); return; } // nur Metadaten geändert
  state.entries = list.map(normalizeEntry).sort(byNewest);
  renderStatus();
  refreshViews();
  checkAchievements();
}

function onSettings(raw, meta = {}) {
  if (settingsSaveTimer) return; // lokale Änderung wartet noch aufs Speichern
  if (raw) {
    state.settings = normalizeSettings(raw);
    // Alte Standardnamen („Person A/B“) einmalig dauerhaft durch Matze & Pia ersetzen
    if (hasLegacyNames(raw) && !meta.fromCache && !state.namesMigrated) {
      state.namesMigrated = true;
      store.saveSettings(serializeSettings(state.settings)).catch(onStoreError);
    }
  } else if (!meta.fromCache && !state.defaultsWritten) {
    // Erster Start: Standardwerte (inkl. Zählbeginn) dauerhaft festschreiben
    state.defaultsWritten = true;
    state.settings = normalizeSettings(null);
    store.saveSettings(serializeSettings(state.settings)).catch(onStoreError);
  }
  state.settingsLoaded = true;
  refreshViews();
  refreshSettingsSummary();
  checkAchievements();
}

function onStoreError(err) {
  console.error("Firestore:", err);
  const code = err?.code || "";
  state.error = code === "permission-denied"
    ? "Keine Berechtigung für Firestore. Prüfe die Sicherheitsregeln deiner Datenbank."
    : `Verbindung zu Firebase fehlgeschlagen${code ? ` (${code})` : ""}. Prüfe die Config in app.js und ob Firestore angelegt ist.`;
  renderStatus();
  renderBanner();
}

function configureChartDefaults() {
  if (!window.Chart) return;
  window.Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  window.Chart.defaults.color = "#7C857F";
}

function init() {
  configureChartDefaults();
  renderQuickActions();
  setupForm();
  bindEvents();

  try {
    store = isFirebaseConfigured() ? createFirestoreStore() : createLocalStore();
  } catch (err) {
    console.error("Firebase-Initialisierung fehlgeschlagen:", err);
    store = createLocalStore();
    state.error = "Firebase konnte nicht gestartet werden. Prüfe die Config in app.js. Bis dahin läuft der lokale Demo-Modus.";
  }
  state.mode = store.mode;

  renderStatus();
  renderBanner();
  renderTracker();
  const hash = location.hash.replace("#", "");
  switchTab(TABS.includes(hash) ? hash : "tracker", { scroll: false });

  // Gleitende Markierungen erst nach dem ersten Zeichnen animieren
  requestAnimationFrame(() => requestAnimationFrame(() => $$(".no-anim").forEach(el => el.classList.remove("no-anim"))));

  store.subscribeSettings(onSettings, onStoreError);
  store.subscribeEntries(onEntries, onStoreError);
}

init();
