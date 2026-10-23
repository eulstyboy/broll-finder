/* Coquille — worker Grammalecte (GPL-3.0, moteur © Olivier R. / Algoo).
   Charge le moteur JavaScript officiel de Grammalecte et vérifie des textes
   entièrement en local : aucune donnée ne quitte le navigateur. */
"use strict";

const BASE = self.location.href.replace(/[^/]*$/, "");

importScripts(
  "graphspell/helpers.js",
  "graphspell/str_transform.js",
  "graphspell/char_player.js",
  "graphspell/lexgraph_fr.js",
  "graphspell/ibdawg.js",
  "graphspell/spellchecker.js",
  "text.js",
  "graphspell/tokenizer.js",
  "fr/conj.js",
  "fr/mfsp.js",
  "fr/phonet.js",
  "fr/cregex.js",
  "fr/gc_options.js",
  "fr/gc_functions.js",
  "fr/gc_rules.js",
  "fr/gc_rules_graph.js",
  "fr/gc_engine.js"
);

let oSpellChecker = null;
let ready = false;

function init(options) {
  conj.init(helpers.loadFile(BASE + "fr/conj_data.json"));
  phonet.init(helpers.loadFile(BASE + "fr/phonet_data.json"));
  mfsp.init(helpers.loadFile(BASE + "fr/mfsp_data.json"));
  gc_engine.load("JavaScript", "aHSL", BASE + "graphspell/_dictionaries");
  oSpellChecker = gc_engine.getSpellChecker();
  if (options) setOptions(options);
  ready = true;
}

function setOptions(options) {
  const m = new Map(Object.entries(options));
  gc_engine.setOptions(m);
}

function suggestionsFor(word) {
  const out = [];
  try {
    for (const group of oSpellChecker.suggest(word, 6)) {
      for (const s of group) if (s && !out.includes(s)) out.push(s);
      if (out.length >= 6) break;
    }
  } catch (e) { /* pas de suggestion */ }
  return out.slice(0, 6);
}

function check(text) {
  const t = text.replace(/­/g, "").normalize("NFC");
  const gramm = gc_engine.parse(t, "FR", false, null, false) || [];
  const spell = (oSpellChecker.parseParagraph(t) || []).map((e) => ({
    nStart: e.nStart, nEnd: e.nEnd, sValue: e.sValue,
    aSuggestions: suggestionsFor(e.sValue)
  }));
  return {
    text: t,
    gramm: gramm.map((e) => ({
      nStart: e.nStart, nEnd: e.nEnd, sType: e.sType, sRuleId: e.sRuleId,
      sLineId: e.sLineId, sMessage: e.sMessage, aSuggestions: e.aSuggestions || [], URL: e.URL || ""
    })),
    spell
  };
}

self.onmessage = (ev) => {
  const { id, cmd, payload } = ev.data;
  try {
    if (cmd === "init") {
      const t0 = performance.now();
      if (!ready) init(payload && payload.options);
      self.postMessage({ id, ok: true, result: { ms: Math.round(performance.now() - t0) } });
    } else if (cmd === "options") {
      setOptions(payload.options);
      self.postMessage({ id, ok: true });
    } else if (cmd === "check") {
      self.postMessage({ id, ok: true, result: payload.texts.map(check) });
    }
  } catch (e) {
    self.postMessage({ id, ok: false, error: String(e && e.message || e) });
  }
};
