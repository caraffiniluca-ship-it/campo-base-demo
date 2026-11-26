"use strict";
// Modulo contenuti e documenti (sotto-fase 1C).
// F05 Incolla l'annuncio · F14 Voice-to-Briefing · F86 Pillola audio con trascrizione e scaletta
// F87 Versione inglese della pillola · F88 Pillola di presentazione nel profilo · F39 Pitch stampabile da GPX
// F71 Documenti dell'uscita · F74 Foto dei partecipanti con consenso.
// Nessuna AI esterna: riconoscimento e riordino sono a regole e usano solo i dati della demo.
// I file (audio, documenti, foto) stanno in IndexedDB, cifrati con AES-GCM e una chiave non esportabile.

(() => {
  // ---------- funzioni pure (si provano anche con node) ----------
  const MESI = { gennaio: 1, gen: 1, febbraio: 2, feb: 2, marzo: 3, mar: 3, aprile: 4, apr: 4, maggio: 5, mag: 5, giugno: 6, giu: 6,
    luglio: 7, lug: 7, agosto: 8, ago: 8, settembre: 9, sett: 9, set: 9, ottobre: 10, ott: 10, novembre: 11, nov: 11, dicembre: 12, dic: 12 };
  const GIORNI_SETT = /\b(?:luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica)\b/gi;
  const EMOJI = /[\p{Extended_Pictographic}️‍⃣]/gu;
  const due = (n) => String(n).padStart(2, "0");
  const isoDi = (a, m, g) => `${a}-${due(m)}-${due(g)}`;
  const dataEsiste = (a, m, g) => { const d = new Date(a, m - 1, g); return d.getFullYear() === a && d.getMonth() === m - 1 && d.getDate() === g; };
  const numIt = (s) => Number(String(s).replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  const entro = (v, min, max) => (Number.isFinite(v) && v >= min && v <= max ? v : null);

  // Toglie telefoni ed email prima di qualsiasi analisi: nel testo dell'annuncio non devono restare contatti.
  function rimuoviContatti(testo) {
    let tel = 0, email = 0;
    let t = String(testo || "").replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, () => { email++; return "[email rimossa]"; });
    const reTel = /(?:(?:\+|00)\s?\d{2}[\s.\-]?)?(?:3\d{2}|0\d{1,3})(?:[\s.\-]?\d){5,8}\b|\+\d[\d\s.\-]{7,}\d/g;
    t = t.replace(reTel, (m) => {
      if (/^\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}$/.test(m.trim())) return m; // è una data, non un numero di telefono
      tel++; return "[telefono rimosso]";
    });
    return { testo: t, telefoni: tel, email };
  }

  function trovaData(testo, oggi) {
    const reMese = new RegExp(`\\b(\\d{1,2})\\s*[°º]?\\s+(${Object.keys(MESI).join("|")})\\.?(?:\\s+(\\d{4}))?\\b`, "i");
    const anno = (m, g) => { let a = oggi.getFullYear(); if (new Date(a, m - 1, g, 23, 59) < oggi) a++; return a; };
    const m1 = testo.match(reMese);
    if (m1) {
      const g = Number(m1[1]), m = MESI[m1[2].toLowerCase()], a = m1[3] ? Number(m1[3]) : anno(m, g);
      if (dataEsiste(a, m, g)) return { iso: isoDi(a, m, g), testo: m1[0] };
    }
    for (const m2 of testo.matchAll(/\b(\d{1,2})([\/\-.])(\d{1,2})(?:\2(\d{2,4}))?\b/g)) {
      if (m2[2] === "." && !m2[4]) continue; // 9.30 è un orario, non una data
      const g = Number(m2[1]), m = Number(m2[3]);
      let a = m2[4] ? Number(m2[4]) : anno(m, g);
      if (a < 100) a += 2000;
      if (m >= 1 && m <= 12 && dataEsiste(a, m, g)) return { iso: isoDi(a, m, g), testo: m2[0] };
    }
    return null;
  }

  function trovaOra(testo) {
    const ok = (h, m) => (h < 24 && m < 60 ? `${due(h)}:${due(m)}` : null);
    const m1 = testo.match(/\b(?:ore|alle|h)\s*(\d{1,2})(?:[:.](\d{2}))?(?!\d)(?!\s*(?:km|m\b|mt|metri|€|euro|posti|persone))/i);
    if (m1) { const r = ok(Number(m1[1]), Number(m1[2] || 0)); if (r) return r; }
    const m2 = testo.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b(?!\s*(?:€|euro|km|m\b|mt|metri))/);
    return m2 ? ok(Number(m2[1]), Number(m2[2])) : null;
  }

  function pulisciLuogo(s) {
    let t = s.replace(EMOJI, " ")
      .replace(/\b(?:alle\s+)?(?:ore|h)?\s*\d{1,2}[:.]\d{2}\b/gi, " ")
      .replace(/\b(?:alle|ore)\s+\d{1,2}\b/gi, " ")
      .split(/[.;(]\s|\s[-–|·]\s|\n/)[0];
    for (let i = 0; i < 4; i++) {
      t = t.trim().replace(/^[:,\-–·]+\s*/, "")
        .replace(/^(?:all'|dall'|nell'|davanti\s+(?:all'|alla|al|a)\s*|presso\s+(?:il|la|lo|l')?\s*|(?:a|al|alla|allo|ai|agli|alle|in|nel|nella|da|dal|dalla|è|e)\s+)/i, "");
    }
    t = t.replace(/[\s,;:.\-–]+$/, "").replace(/\s{2,}/g, " ").trim();
    return t.length >= 3 ? t.slice(0, 80) : null;
  }

  // F05: riconoscitore a regole. Restituisce solo ciò che trova scritto; il resto resta null.
  function estraiAnnuncio(testoOriginale, oggi = new Date()) {
    const pulito = rimuoviContatti(testoOriginale);
    const testo = pulito.testo;
    const campi = { titolo: null, data: null, oraPartenza: null, ritrovo: null, km: null, dislivello: null, prezzo: null, posti: null, difficolta: null };

    const data = trovaData(testo, oggi);
    if (data) campi.data = data.iso;
    const senzaData = data ? testo.replace(data.testo, " ") : testo;

    const reRitrovo = /(?:ritrovo|appuntamento|punto d[i'] ?incontro|ci (?:vediamo|troviamo)|partenza da)\b\s*[:\-–]?\s*([^\n]{3,160})/i;
    const mR = senzaData.match(reRitrovo);
    if (mR) campi.ritrovo = pulisciLuogo(mR[1]);
    campi.oraPartenza = (mR && trovaOra(mR[0])) || trovaOra(senzaData);

    const mT = testo.match(/^\s*titolo\s*[:\-]\s*(.+)$/im);
    let titolo = mT ? mT[1] : (testo.split("\n").find((r) => /\p{L}{3,}/u.test(r.replace(EMOJI, ""))) || "");
    if (data) titolo = titolo.replace(data.testo, " ");
    titolo = titolo.replace(EMOJI, " ").replace(GIORNI_SETT, " ").replace(/\[(?:telefono|email) rimoss[oa]\]/g, " ")
      .replace(/\s{2,}/g, " ").replace(/^[\s:,\-–|·*_#]+|[\s:,\-–|·*_#!]+$/g, "").trim();
    if (titolo.length >= 3 && !/^(?:ritrovo|appuntamento)\b/i.test(titolo)) campi.titolo = titolo.slice(0, 70);

    const mKm = senzaData.match(/(\d+(?:[.,]\d+)?)\s*(?:km|chilometri)\b/i);
    if (mKm) campi.km = entro(numIt(mKm[1]), 0.1, 80);

    const mD = senzaData.match(/(?:dislivello|disl\.?|d\+)\s*(?:positivo|in salita)?\s*[:=]?\s*\+?\s*(\d{1,2}\.\d{3}|\d{2,4})\s*(?:m|mt|metri)?\b/i)
      || senzaData.match(/\+\s*(\d{1,2}\.\d{3}|\d{2,4})\s*(?:m|mt|metri)\b/i)
      || senzaData.match(/(\d{1,2}\.\d{3}|\d{2,4})\s*(?:m|mt|metri)\s+(?:di\s+)?(?:dislivello|d\+)/i);
    if (mD) campi.dislivello = entro(numIt(mD[1]), 0, 5000);

    const mP = senzaData.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|euro|eur)\b/i) || senzaData.match(/(\d+(?:[.,]\d{1,2})?)\s*€/)
      || senzaData.match(/€\s*(\d+(?:[.,]\d{1,2})?)/)
      || senzaData.match(/(?:quota|costo|prezzo|contributo)\s*(?:di\s+)?(?:partecipazione)?\s*[:=]?\s*(\d+(?:[.,]\d{1,2})?)\b(?!\s*(?:km|m\b|mt|metri|posti))/i);
    if (mP) campi.prezzo = entro(numIt(mP[1]), 0, 2000);

    const mPo = senzaData.match(/(\d{1,2})\s*posti/i) || senzaData.match(/posti\s*(?:disponibili|liberi)?\s*[:=]\s*(\d{1,2})\b/i)
      || senzaData.match(/(?:max|massimo)\.?\s*(\d{1,2})\s*(?:persone|partecipanti|iscritti)/i);
    if (mPo) campi.posti = entro(Number(mPo[1]), 1, 60);

    const mDi = senzaData.match(/(?:difficolt[aà]|diff\.|livello)\s*[:=]?\s*(EEA|EE|E|T)\b/i);
    if (mDi) campi.difficolta = mDi[1].toUpperCase();
    else {
      const mParola = senzaData.match(/(?:difficolt[aà]|percorso)\s*[:=]?\s*(turistic|escursionistic|per escursionisti esperti|esperti)/i);
      const mSigla = senzaData.match(/\b(EEA|EE)\b/);
      if (mParola) campi.difficolta = /esperti/i.test(mParola[1]) ? "EE" : /turistic/i.test(mParola[1]) ? "T" : "E";
      else if (mSigla) campi.difficolta = mSigla[1];
    }
    return { campi, testoPulito: testo, telefoni: pulito.telefoni, email: pulito.email };
  }

  // F14: riordino a regole della trascrizione di un vocale.
  const RIEMPITIVI = /\b(?:ehm+|uhm+|mmh+|ehh+|cioè|praticamente|diciamo|insomma|vabbè|vabbe|e niente|boh)\b[,]?\s*/gi;
  const GRUPPI = [
    ["portare", /\b(?:port(?:a|ate|are|atevi)|servono|serve|necessari|obbligatori|scarpon|scarpe|acqua|giacca|k-?way|pranzo|panino|zaino|bastonc|frontal|cambio|crema|cappello|guanti|borraccia|pile|strato)/i],
    ["ritrovo", /\b(?:ritrovo|ci vediamo|ci troviamo|appuntamento|parcheggio|piazza|davanti|incontr)/i],
    ["orari", /\b(?:ore\b|alle \d|orari|partenza|partiamo|rientr|torniamo|mezzogiorno|mattina|pomeriggio|tramonto)|\b\d{1,2}[:.]\d{2}\b/i],
  ];
  const gruppoDi = (f) => (GRUPPI.find(([, re]) => re.test(f)) || ["altro"])[0];
  const pulisciFrase = (f) => {
    let t = f.replace(RIEMPITIVI, "").trim();
    for (let i = 0; i < 3; i++) t = t.replace(/^(?:ciao(?: a tutti| ragazzi| ragazze)?|buongiorno|buonasera|salve|allora|quindi|ok|okay|e)\b[,!.\s]*/i, "");
    return t.replace(/[\s,]*\b(?:a presto|un abbraccio|ciao a tutti|ciao|grazie(?: a tutti)?|buona (?:serata|giornata))[\s!.,]*$/i, "").trim();
  };
  // Divide in frasi e poi in pezzi separati da virgola; pezzi vicini dello stesso argomento si riuniscono (es. un elenco di cose da portare).
  function frasiDi(testo) {
    const viste = new Set(), out = [];
    const frasi = String(testo || "").replace(/\s+/g, " ").replace(/([.!?]) /g, "$1\n").split(/\n|\s*\b(?:e poi|poi|inoltre|un'altra cosa|altra cosa|ah,? e)\b\s*/i);
    for (const frase of frasi) {
      let prec = null;
      for (const pezzo of frase.split(/,\s+/).map(pulisciFrase).filter((x) => x.length > 2)) {
        const g = gruppoDi(pezzo);
        if (prec && prec.g === g) prec.t += ", " + pezzo; else { prec = { g, t: pezzo }; out.push(prec); }
      }
    }
    return out.map(({ g, t }) => ({ g, t: t.charAt(0).toUpperCase() + t.slice(1).replace(/[\s,;]+$/, "") + (/[.!?]$/.test(t) ? "" : ".") }))
      .filter(({ t }) => { const k = t.toLowerCase(); if (viste.has(k)) return false; viste.add(k); return true; });
  }
  function riordinaVocale(trascrizione, info = {}) {
    const sez = { ritrovo: [], orari: [], portare: [], altro: [] };
    for (const { g, t } of frasiDi(trascrizione)) sez[g].push(t);
    const dallaScheda = [];
    if (!sez.ritrovo.length && info.ritrovo) { sez.ritrovo.push(`${info.ritrovo}.`); dallaScheda.push("ritrovo"); }
    if (!sez.orari.length && info.ora && !sez.ritrovo.some((r) => GRUPPI[2][1].test(r))) { sez.orari.push(`Partenza alle ${info.ora}.`); dallaScheda.push("orario"); }
    const blocco = (titolo, righe) => (righe.length ? `${titolo}\n${righe.map((r) => `- ${r}`).join("\n")}\n` : "");
    const testo = [
      `Ciao a tutti!${info.titolo ? ` Ecco le informazioni per ${info.titolo}${info.data ? `, ${info.data}` : ""}.` : ""}`, "",
      blocco("📍 Ritrovo", sez.ritrovo) + blocco("🕘 Orari", sez.orari) + blocco("🎒 Cosa portare", sez.portare) + blocco("ℹ️ Altre informazioni", sez.altro),
      `A presto${info.firma ? `, ${info.firma}` : ""}`,
    ].join("\n").replace(/\n{3,}/g, "\n\n");
    return { testo, dallaScheda, frasi: Object.values(sez).reduce((a, r) => a + r.length, 0) };
  }

  // F39: profilo distanza/quota dai punti della traccia e punti di interesse sui waypoint.
  function distanza(a, b) {
    const R = 6371000, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function profiloDaPunti(punti, wpt = []) {
    let m = 0;
    const tutti = punti.map((p, i) => { if (i) m += distanza(punti[i - 1], p); return { d: m / 1000, e: p.ele, lat: p.lat, lon: p.lon }; });
    const conQuota = tutti.filter((p) => Number.isFinite(p.e));
    const passo = Math.max(1, Math.ceil(conQuota.length / 300));
    const prof = conQuota.filter((p, i) => i % passo === 0 || i === conQuota.length - 1).map((p) => ({ d: p.d, e: p.e }));
    const poi = wpt.map((w) => {
      let best = null, dmin = Infinity;
      for (const p of tutti) { const d = distanza(p, w); if (d < dmin) { dmin = d; best = p; } }
      return best && dmin < 500 ? { nome: w.nome, d: best.d, e: Number.isFinite(best.e) ? best.e : null } : null;
    }).filter(Boolean).sort((a, b) => a.d - b.d).slice(0, 12);
    return { prof, poi, km: m / 1000 };
  }
  function svgAltimetria(prof, poi = []) {
    if (prof.length < 2) return "";
    const W = 640, H = 220, ml = 46, mr = 12, mt = 16, mb = 28;
    const dMax = prof[prof.length - 1].d || 1;
    let eMin = Math.min(...prof.map((p) => p.e)), eMax = Math.max(...prof.map((p) => p.e));
    if (eMax - eMin < 60) { const c = (eMax + eMin) / 2; eMin = c - 30; eMax = c + 30; }
    const x = (d) => (ml + (d / dMax) * (W - ml - mr)).toFixed(1);
    const y = (e) => (mt + ((eMax - e) / (eMax - eMin)) * (H - mt - mb)).toFixed(1);
    const linea = prof.map((p, i) => `${i ? "L" : "M"}${x(p.d)} ${y(p.e)}`).join(" ");
    const passo = [0.5, 1, 2, 5, 10, 20].find((s) => dMax / s <= 7) || 20;
    let tacche = "";
    for (let k = 0; k <= dMax + 1e-9; k += passo) tacche += `<line x1="${x(k)}" x2="${x(k)}" y1="${H - mb}" y2="${H - mb + 4}" style="stroke:var(--tenue)"/><text x="${x(k)}" y="${H - 8}" text-anchor="middle">${String(Math.round(k * 10) / 10).replace(".", ",")}</text>`;
    const pt = poi.filter((p) => p.e !== null).map((p, i) => `<circle cx="${x(p.d)}" cy="${y(p.e)}" r="5" style="fill:var(--lampone);stroke:var(--carta);stroke-width:1.5"/><text x="${x(p.d)}" y="${Number(y(p.e)) - 9}" text-anchor="middle" style="font-weight:700;fill:var(--notte)">${i + 1}</text>`).join("");
    return `<svg class="cn-altimetria" viewBox="0 0 ${W} ${H}" role="img" aria-label="Altimetria: quota da ${Math.round(Math.min(...prof.map((p) => p.e)))} a ${Math.round(Math.max(...prof.map((p) => p.e)))} metri su ${String(Math.round(dMax * 10) / 10).replace(".", ",")} chilometri">
      <g style="font-size:11px;fill:var(--tenue);font-family:inherit">
      <line x1="${ml}" x2="${W - mr}" y1="${H - mb}" y2="${H - mb}" style="stroke:var(--linea)"/>
      <line x1="${ml}" x2="${W - mr}" y1="${y(eMax)}" y2="${y(eMax)}" style="stroke:var(--linea);stroke-dasharray:3 4"/>
      <text x="${ml - 6}" y="${y(eMax)}" text-anchor="end" dominant-baseline="middle">${Math.round(eMax)} m</text>
      <text x="${ml - 6}" y="${y(eMin)}" text-anchor="end" dominant-baseline="middle">${Math.round(eMin)} m</text>
      <path d="${linea} L${x(dMax)} ${H - mb} L${x(0)} ${H - mb} Z" style="fill:var(--morbido)"/>
      <path d="${linea}" style="fill:none;stroke:var(--prussia);stroke-width:2.2;stroke-linejoin:round"/>
      ${tacche}<text x="${W - mr}" y="${mt - 4}" text-anchor="end">km</text>${pt}</g></svg>`;
  }

  // F74: una foto è pubblica solo se ogni persona ritratta ha dato il consenso (ultimo consenso registrato).
  const consensoFoto = (p) => { const c = (p?.consensi || []).filter((x) => x.tipo === "foto"); return c.length ? !!c[c.length - 1].valore : false; };
  function fotoPubblica(u, f) {
    if (!f.persone.length) return !!f.nessunaPersona;
    return f.persone.every((pid) => consensoFoto(u.partecipanti.find((x) => x.id === pid)));
  }

  globalThis.ModuloContenuti = { rimuoviContatti, estraiAnnuncio, riordinaVocale, profiloDaPunti, svgAltimetria, consensoFoto, fotoPubblica };
  if (typeof V === "undefined") return; // in node si provano solo le funzioni pure

  // ---------- archivio dei file: IndexedDB + cifratura ----------
  const IDB = (() => {
    let dbp = null;
    const apri = () => dbp ??= new Promise((ok, ko) => {
      if (!window.indexedDB) { dbp = null; ko(new Error("Questo browser non permette di salvare file: prova senza navigazione privata.")); return; }
      const r = indexedDB.open("campobase-contenuti", 1);
      r.onupgradeneeded = () => { r.result.createObjectStore("file"); r.result.createObjectStore("chiavi"); };
      r.onsuccess = () => ok(r.result);
      r.onerror = () => { dbp = null; ko(new Error("Archivio dei file non disponibile: il browser blocca IndexedDB (navigazione privata?).")); };
    });
    const op = (store, modo, fn) => apri().then((db) => new Promise((ok, ko) => {
      const tx = db.transaction(store, modo), req = fn(tx.objectStore(store));
      tx.oncomplete = () => ok(req.result);
      tx.onerror = tx.onabort = () => ko(new Error(tx.error && tx.error.name === "QuotaExceededError" ? "Spazio del browser pieno: elimina qualche file e riprova." : "Errore dell'archivio dei file: riprova."));
    }));
    return {
      get: (s, k) => op(s, "readonly", (st) => st.get(k)), put: (s, k, v) => op(s, "readwrite", (st) => st.put(v, k)),
      del: (s, k) => op(s, "readwrite", (st) => st.delete(k)), chiavi: (s) => op(s, "readonly", (st) => st.getAllKeys()),
    };
  })();
  let chiaveP = null;
  const chiaveCifratura = () => chiaveP ??= (async () => {
    if (!window.crypto?.subtle) throw new Error("Cifratura non disponibile: apri la demo da https o da localhost.");
    let k = await IDB.get("chiavi", "principale");
    if (!k) { k = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]); await IDB.put("chiavi", "principale", k); }
    return k;
  })().catch((e) => { chiaveP = null; throw e; });
  async function salvaFile(blob) {
    const k = await chiaveCifratura(), iv = crypto.getRandomValues(new Uint8Array(12));
    const dati = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, await blob.arrayBuffer());
    const chiave = codiceCasuale();
    await IDB.put("file", chiave, { iv, dati, tipo: blob.type });
    return chiave;
  }
  async function leggiFile(chiave) {
    const r = await IDB.get("file", chiave);
    if (!r) return null;
    const d = await crypto.subtle.decrypt({ name: "AES-GCM", iv: r.iv }, await chiaveCifratura(), r.dati);
    return new Blob([d], { type: r.tipo });
  }
  const eliminaFile = (chiave) => (chiave ? IDB.del("file", chiave).catch(() => {}) : Promise.resolve());

  // Gli elementi con data-cn-file ricevono il file decifrato dopo che la schermata è stata disegnata.
  const urlAttivi = new Map();
  async function idrata() {
    for (const [url, el] of urlAttivi) if (!el.isConnected) { URL.revokeObjectURL(url); urlAttivi.delete(url); }
    for (const el of document.querySelectorAll("[data-cn-file]:not([data-cn-pronto])")) {
      el.dataset.cnPronto = "1";
      try {
        const b = await leggiFile(el.dataset.cnFile);
        if (!b) { el.replaceWith(Object.assign(document.createElement("p"), { className: "nota testo-attenzione", textContent: "File non più presente su questo telefono." })); continue; }
        const url = URL.createObjectURL(b); urlAttivi.set(url, el);
        if (el.tagName === "A") el.href = url; else el.src = url;
      } catch (e) { el.replaceWith(Object.assign(document.createElement("p"), { className: "nota testo-errore", textContent: e.message || "Non riesco a leggere il file." })); }
    }
  }
  // Pulizia: i file che nessun dato richiama più (uscita cancellata, dati ripristinati) vengono eliminati.
  function chiaviUsate() {
    const s = new Set();
    for (const u of S.uscite) {
      (u.pillole || []).forEach((p) => p.audio && s.add(p.audio.chiave));
      (u.documenti || []).forEach((d) => s.add(d.chiave));
      (u.foto || []).forEach((f) => s.add(f.chiave));
    }
    if (S.leader?.presentazione?.audio) s.add(S.leader.presentazione.audio.chiave);
    return s;
  }
  async function pulisciOrfani() {
    try { const usate = chiaviUsate(); for (const k of await IDB.chiavi("file")) if (!usate.has(k)) await eliminaFile(k); } catch (e) { /* archivio non disponibile */ }
  }
  window.addEventListener("DOMContentLoaded", () => {
    const app = document.getElementById("app");
    if (app && window.MutationObserver) new MutationObserver(() => idrata()).observe(app, { childList: true });
    setTimeout(pulisciOrfani, 2000);
  });

  const MB5 = 5 * 1024 * 1024;
  const peso = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1024))} kB`);
  const quando = (iso) => new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
  const chipAuto = `<span class="chip c-ai">✦ Automatico</span>`;
  const conferma2 = (el, testo) => { if (el.dataset.conferma === "si") return true; el.dataset.conferma = "si"; el.textContent = testo; return false; };
  const tappeDi = (u) => [...new Set([...(u.tappe || []), ...(u.soste || [])].map((s) => (typeof s === "string" ? s : s?.nome || s?.titolo || s?.luogo)).filter(Boolean))];
  const datalistTappe = (u, id) => `<datalist id="${id}">${tappeDi(u).map((n) => `<option value="${esc(n)}">`).join("")}</datalist>`;

  // ---------- F05 Incolla l'annuncio ----------
  let annuncio = null; // risultato dell'analisi, solo in memoria finché il leader non conferma
  const CAMPI_ANNUNCIO = [
    ["titolo", "Titolo", "text", 'maxlength="70"'], ["data", "Data", "date", ""], ["oraPartenza", "Ora di ritrovo", "time", ""],
    ["ritrovo", "Ritrovo", "text", 'maxlength="80"'], ["km", "Km", "number", 'step="0.1" min="0.1" max="80"'],
    ["dislivello", "Dislivello m", "number", 'min="0" max="5000"'], ["prezzo", "Prezzo €", "number", 'min="0" max="2000"'],
    ["posti", "Posti", "number", 'min="1" max="60"'], ["difficolta", "Difficoltà", "select", ""],
  ];
  V.annuncio = () => {
    if (!annuncio) {
      return `${indietro("#uscite", "Uscite")}
        <h1>Incolla l'annuncio</h1>
        <p class="nota">Incolla il messaggio che scriveresti nel gruppo WhatsApp: l'app prova a compilare la scheda e tu controlli. Telefoni ed email vengono tolti prima dell'analisi. Non incollare dati dei partecipanti.</p>
        <form class="box modulo" data-form="cn-annuncio">
          <label for="cn-ann-testo">Testo dell'annuncio</label>
          <textarea id="cn-ann-testo" name="testo" rows="9" maxlength="3000" required placeholder="Es. Anello del Monte Cucco, sabato 14 dicembre. Ritrovo ore 9:30 al parcheggio di Pian di Spilli. 14 km, dislivello 780 m, difficoltà E. Quota 25 €, 12 posti."></textarea>
          <button class="btn primario" type="submit">Analizza il testo</button>
          <p class="nota">${chipAuto} Riconoscimento a regole sul telefono, senza AI esterna: trova solo ciò che è scritto, non inventa numeri né prezzi.</p>
        </form>`;
    }
    const a = annuncio, c = a.campi;
    const trovati = CAMPI_ANNUNCIO.filter(([k]) => c[k] !== null).length;
    const campo = ([k, nome, tipo, extra]) => {
      const manca = c[k] === null;
      const testa = `<div class="riga"><label for="cn-a-${k}">${nome} *</label><span class="chip ${manca ? "c-attenzione" : "c-ok"}">${manca ? "Non trovato: completa" : "Trovato"}</span></div>`;
      const input = tipo === "select"
        ? `<select id="cn-a-${k}" name="${k}"><option value="">Scegli…</option>${["T", "E", "EE", "EEA"].map((d) => `<option ${d === c[k] ? "selected" : ""}>${d}</option>`).join("")}</select>`
        : `<input id="cn-a-${k}" name="${k}" type="${tipo}" ${extra} value="${esc(c[k] ?? "")}">`;
      return `<div class="cn-campo ${manca ? "cn-mancante" : ""}">${testa}${input}</div>`;
    };
    return `${indietro("#uscite", "Uscite")}
      <h1>Controlla la scheda</h1>
      <div class="chips">${chipAuto}<span class="chip ${trovati === CAMPI_ANNUNCIO.length ? "c-ok" : "c-attenzione"}">${trovati} campi trovati su ${CAMPI_ANNUNCIO.length}</span></div>
      <section class="box"><span class="eti">Testo analizzato</span>
        <div class="cn-testo">${esc(a.testoPulito)}</div>
        <p class="nota">${a.telefoni || a.email ? `Tolti prima dell'analisi: ${a.telefoni} numeri di telefono e ${a.email} email.` : "Nessun telefono o email trovato nel testo."} Il testo non viene salvato.</p></section>
      <form class="box modulo" data-form="cn-annuncio-salva" novalidate>
        ${CAMPI_ANNUNCIO.map(campo).join("")}
        <label for="cn-a-cond">Condizioni di annullamento</label>
        <textarea id="cn-a-cond" name="condizioni" rows="3" maxlength="400"></textarea>
        <p class="nota">Le condizioni non si ricavano dall'annuncio: senza, la bozza non si può pubblicare. Coordinate del ritrovo approssimative: importa il GPX da Modifica.</p>
        <p class="testo-errore" id="cn-errori-annuncio" hidden></p>
        <button class="btn primario" type="submit">Conferma e salva come bozza</button>
        <button class="btn secondario" type="button" data-azione="cn-annuncio-ricomincia">Ricomincia con un altro testo</button>
        <p class="nota">Nulla viene salvato finché non confermi.</p>
      </form>`;
  };
  const baseUscite = V.uscite;
  V.uscite = () => {
    const html = baseUscite();
    const fab = '<a class="btn primario fab" href="#nuova">';
    const link = `<a class="btn secondario" href="#annuncio">📋 Crea da un annuncio incollato</a>`;
    return html.includes(fab) ? html.replace(fab, link + fab) : html + link;
  };

  // ---------- F14 Voice-to-Briefing ----------
  const vocali = {}; // per uscita, solo in memoria: la trascrizione non si salva
  V.vocale = (id) => {
    const u = uscita(id);
    if (!u) return `<h1>Uscita non trovata</h1><a class="btn secondario" href="#uscite">Torna alle uscite</a>`;
    const v = vocali[u.id] || {};
    return `${indietro(`#uscita/${u.id}`, u.titolo)}
      <h1>Dal vocale al messaggio</h1>
      <p class="nota">Nella demo non si registra: incolla o scrivi la trascrizione del tuo vocale. L'app la riordina in saluto, ritrovo, orari, cosa portare e chiusura. Tu rileggi e copi.</p>
      <form class="box modulo" data-form="cn-vocale" data-id="${u.id}">
        <label for="cn-voc">Trascrizione del vocale</label>
        <textarea id="cn-voc" name="trascrizione" rows="7" maxlength="3000" required placeholder="Es. ciao ragazzi allora sabato ci vediamo al parcheggio di Pian di Spilli alle 9 e mezza, portate i bastoncini e il pranzo al sacco, poi rientriamo verso le 16">${esc(v.trascrizione || "")}</textarea>
        <button class="btn primario" type="submit">Riordina in un messaggio</button>
      </form>
      ${v.messaggio ? `<section class="box modulo">
        <div class="riga"><span class="eti">Messaggio da rileggere</span>${chipAuto}</div>
        <label class="visuale-nascosta" for="cn-voc-msg">Messaggio</label>
        <textarea id="cn-voc-msg" rows="12" maxlength="4000">${esc(v.messaggio)}</textarea>
        <p class="nota">Riordino automatico a regole: le frasi sono le tue, non aggiunge indicazioni di sicurezza né dati tecnici.${v.dallaScheda?.length ? ` Presi dalla scheda dell'uscita: ${esc(v.dallaScheda.join(" e "))}.` : ""} Correggi il testo qui sopra se serve.</p>
        <label class="spunta"><input type="checkbox" id="cn-voc-letto"> Ho riletto il messaggio</label>
        <button class="btn primario" data-azione="cn-vocale-copia" data-id="${u.id}">Copia per WhatsApp</button>
      </section>` : ""}`;
  };

  // ---------- F86 / F87 / F88 Pillole ----------
  const VISIBILITA = { leader: "Solo io", iscritti: "Iscritti, dal loro link personale", pubblica: "Pagina pubblica dell'uscita" };
  const nuovaPillola = () => ({ id: 0, titolo: "", testo: "", audio: null, soloVoce: false, trascrizione: "", scaletta: [], fonte: "", stato: "bozza", visibilita: "leader",
    en: { titolo: "", testo: "", trascrizione: "", verificata: false }, consenso: null, aggiornata: null });
  function trovaPillola(pid) {
    for (const u of S.uscite) { const p = (u.pillole || []).find((x) => x.id === Number(pid)); if (p) return { u, p }; }
    return null;
  }
  function htmlPillola(p, conInglese = true) {
    return `<div class="cn-pillola">
      <strong>${esc(p.titolo)}</strong>
      <p class="cn-testo">${esc(p.testo)}</p>
      ${p.audio ? `<audio controls preload="none" data-cn-file="${esc(p.audio.chiave)}" aria-label="Audio: ${esc(p.titolo)}"></audio>` : ""}
      ${p.scaletta.length ? `<ol class="cn-scaletta">${p.scaletta.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
      ${p.trascrizione ? `<details><summary>Trascrizione</summary><p class="cn-testo nota">${esc(p.trascrizione)}</p></details>` : ""}
      ${p.fonte ? `<p class="nota">Fonte: ${esc(p.fonte)}</p>` : ""}
      ${conInglese && (p.en.testo || p.en.trascrizione) ? `<details lang="en"><summary>English version · <span class="chip ${p.en.verificata ? "c-info" : "c-attenzione"}">${p.en.verificata ? "traduzione controllata dal leader" : "traduzione da verificare"}</span></summary>
        ${p.en.titolo ? `<strong>${esc(p.en.titolo)}</strong>` : ""}<p class="cn-testo">${esc(p.en.testo)}</p>${p.en.trascrizione ? `<p class="cn-testo nota">${esc(p.en.trascrizione)}</p>` : ""}
        <p class="nota" lang="it">In caso di differenze vale il testo italiano.</p></details>` : ""}
    </div>`;
  }
  const chipPillola = (p) => (p.stato === "pubblicata" ? `<span class="chip c-ok">Pubblicata</span>` : `<span class="chip c-bozza">Bozza</span>`);

  V.pillole = (id) => {
    const u = uscita(id);
    if (!u) return `<h1>Uscita non trovata</h1><a class="btn secondario" href="#uscite">Torna alle uscite</a>`;
    const lista = u.pillole || [];
    return `${indietro(`#uscita/${u.id}`, u.titolo)}
      <h1>Pillole</h1>
      <p class="nota">Brevi contenuti da ascoltare alle soste: testo, audio facoltativo fino a 3 minuti, trascrizione e scaletta. Senza trascrizione non si pubblicano.</p>
      ${lista.length ? lista.map((p) => `<section class="box">
        <div class="riga">${chipPillola(p)}<span class="chip c-info">${esc(VISIBILITA[p.visibilita])}</span>${p.audio ? `<span class="chip c-info">audio ${esc(Math.round(p.audio.durata))} s</span>` : ""}</div>
        ${htmlPillola(p)}
        <a class="btn secondario piccolo" href="#pillola/${p.id}">Modifica</a></section>`).join("") : `<p class="vuoto">Nessuna pillola per questa uscita.</p>`}
      <a class="btn primario" href="#pillola/n${u.id}">＋ Nuova pillola</a>`;
  };

  V.pillola = (rif) => {
    let u = null, p = null, profilo = false;
    if (rif === "profilo") { profilo = true; p = S.leader.presentazione || nuovaPillola(); }
    else if (/^n\d+$/.test(rif || "")) { u = uscita(rif.slice(1)); p = nuovaPillola(); }
    else { const t = trovaPillola(rif); if (t) ({ u, p } = t); }
    if (!p || (!profilo && !u)) return `<h1>Pillola non trovata</h1><a class="btn secondario" href="#uscite">Torna alle uscite</a>`;
    const nuova = !p.id;
    const dove = profilo ? "profilo" : `u${u.id}`;
    const spuntiOk = u ? u.spunti.filter((s) => s.stato === "convalidato") : [];
    return `${profilo ? indietro("#profilo", "Profilo") : indietro(`#pillole/${u.id}`, "Pillole")}
      <h1>${profilo ? "Pillola di presentazione" : nuova ? "Nuova pillola" : "Modifica pillola"}</h1>
      ${profilo ? `<p class="nota">Facoltativa: si vede nella tua pagina pubblica solo con il tuo consenso. Puoi toglierla quando vuoi.</p>` : ""}
      <form class="box modulo" data-form="cn-pillola" data-dove="${dove}" data-pid="${p.id || ""}" novalidate>
        <label for="cn-pl-titolo">Titolo *</label><input id="cn-pl-titolo" name="titolo" maxlength="80" value="${esc(p.titolo)}">
        <label for="cn-pl-testo">Testo *</label><textarea id="cn-pl-testo" name="testo" rows="4" maxlength="1500">${esc(p.testo)}</textarea>
        <label for="cn-pl-audio">Audio (facoltativo: MP3, M4A, OGG, WAV o WebM, fino a 3 minuti e 5 MB)</label>
        ${p.audio ? `<audio controls preload="none" data-cn-file="${esc(p.audio.chiave)}" aria-label="Audio attuale"></audio>
          <label class="spunta"><input type="checkbox" name="togliAudio"> Togli l'audio attuale</label>` : ""}
        <input id="cn-pl-audio" type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/wav,audio/webm" data-azione="cn-audio">
        <input type="hidden" name="audioChiave"><input type="hidden" name="audioDurata"><input type="hidden" name="audioTipo">
        <p class="nota" id="cn-esito-audio">L'audio resta su questo telefono, cifrato.</p>
        <label class="spunta"><input type="checkbox" name="soloVoce" ${p.soloVoce ? "checked" : ""}> L'audio contiene solo la mia voce, senza musica o testi di altri</label>
        <label for="cn-pl-trascr">Trascrizione * (obbligatoria per pubblicare)</label>
        <textarea id="cn-pl-trascr" name="trascrizione" rows="5" maxlength="5000">${esc(p.trascrizione)}</textarea>
        <p class="nota">Nella demo la trascrizione la scrivi tu: serve a chi non può ascoltare.</p>
        <div class="riga"><label for="cn-pl-scal">Scaletta, un punto per riga</label>${spuntiOk.length ? `<button class="btn secondario piccolo" type="button" data-azione="cn-scaletta" data-id="${u.id}">Proponi dagli spunti convalidati</button>` : ""}</div>
        <textarea id="cn-pl-scal" name="scaletta" rows="3" maxlength="600">${esc(p.scaletta.join("\n"))}</textarea>
        <p class="nota" id="cn-nota-scaletta">${spuntiOk.length ? "La proposta usa solo spunti che hai convalidato: rileggila." : "La scaletta è facoltativa."}</p>
        <label for="cn-pl-fonte">Fonte</label><input id="cn-pl-fonte" name="fonte" maxlength="200" value="${esc(p.fonte)}" placeholder="Es. conoscenza diretta del leader">
        ${profilo ? `<label class="spunta"><input type="checkbox" name="consenso" ${p.consenso ? "checked" : ""}> Acconsento a mostrare questa pillola (testo e voce) nella mia pagina pubblica. Posso ritirare il consenso quando voglio.</label>`
          : `<label for="cn-pl-vis">Visibilità</label><select id="cn-pl-vis" name="visibilita">${Object.entries(VISIBILITA).map(([k, n]) => `<option value="${k}" ${p.visibilita === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`}
        <details ${p.en.testo ? "open" : ""}><summary><b>Versione inglese (facoltativa)</b></summary>
          <div class="modulo cn-blocco">
            <p class="nota"><span class="chip c-attenzione">Traduzione da verificare</span> Nella demo non c'è traduzione automatica: la scrivi tu. Prevale sempre il testo italiano.</p>
            <label for="cn-en-titolo">Title</label><input id="cn-en-titolo" name="enTitolo" lang="en" maxlength="80" value="${esc(p.en.titolo)}">
            <label for="cn-en-testo">Text</label><textarea id="cn-en-testo" name="enTesto" lang="en" rows="4" maxlength="1500">${esc(p.en.testo)}</textarea>
            <label for="cn-en-trascr">Transcript</label><textarea id="cn-en-trascr" name="enTrascrizione" lang="en" rows="4" maxlength="5000">${esc(p.en.trascrizione)}</textarea>
            <label class="spunta"><input type="checkbox" name="enVerificata" ${p.en.verificata ? "checked" : ""}> Ho controllato la traduzione con l'originale</label>
          </div></details>
        <p class="testo-errore" id="cn-errori-pillola" hidden></p>
        <button class="btn primario" type="submit" value="pubblica">${profilo ? "Pubblica nel profilo" : "Pubblica"}</button>
        <button class="btn secondario" type="submit" value="bozza">Salva come bozza</button>
        ${nuova ? "" : `<button class="btn secondario testo-errore" type="button" data-azione="cn-pillola-elimina" data-dove="${dove}" data-pid="${p.id}">Elimina la pillola</button>`}
      </form>`;
  };

  const baseProfilo = V.profilo;
  V.profilo = () => {
    const html = baseProfilo();
    const p = S.leader.presentazione;
    const sezione = `<section class="box">
      <span class="eti">Pillola di presentazione</span>
      ${p ? `<div class="riga">${p.stato === "pubblicata" && p.consenso ? `<span class="chip c-ok">Nella pagina pubblica</span>` : `<span class="chip c-bozza">Non visibile</span>`}${p.consenso ? `<span class="chip c-info">Consenso del ${esc(quando(p.consenso.quando))}</span>` : `<span class="chip c-attenzione">Senza consenso</span>`}</div>
        ${htmlPillola(p)}
        <div class="riga"><a class="btn secondario piccolo" href="#pillola/profilo">Modifica</a>
          ${p.consenso ? `<button class="btn secondario piccolo" data-azione="cn-presentazione-ritira">Ritira il consenso</button>` : ""}
          <button class="btn secondario piccolo testo-errore" data-azione="cn-pillola-elimina" data-dove="profilo" data-pid="${p.id}">Rimuovi la pillola</button></div>`
        : `<p class="nota">Facoltativa: un breve testo, e se vuoi la tua voce, per presentarti nella pagina pubblica. Si pubblica solo con il tuo consenso.</p>
        <a class="btn secondario" href="#pillola/profilo">Aggiungi la pillola di presentazione</a>`}
    </section>`;
    const re = /<section class="box">\s*<span class="eti">La tua pagina pubblica<\/span>/;
    return re.test(html) ? html.replace(re, (m) => sezione + "\n    " + m) : html + sezione;
  };
  const baseLeader = V.leader;
  V.leader = () => {
    const html = baseLeader(), p = S.leader.presentazione;
    if (!p || p.stato !== "pubblicata" || !p.consenso) return html;
    const pezzo = `<section class="box"><span class="eti">Chi sono</span>${htmlPillola(p)}</section>`;
    const segno = '<section class="box"><span class="eti">Contatto</span>';
    return html.includes(segno) ? html.replace(segno, pezzo + segno) : html + pezzo;
  };

  // ---------- F39 Pitch stampabile da GPX ----------
  const pitchGPX = {}; // per uscita, solo in memoria: il GPX non viene salvato
  function leggiGPX(testo) {
    const doc = new DOMParser().parseFromString(testo, "application/xml");
    const punti = [...doc.querySelectorAll("trkpt, rtept")].map((p) => ({ lat: parseFloat(p.getAttribute("lat")), lon: parseFloat(p.getAttribute("lon")), ele: parseFloat(p.querySelector("ele")?.textContent) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
    const wpt = [...doc.querySelectorAll("wpt")].map((w) => ({ lat: parseFloat(w.getAttribute("lat")), lon: parseFloat(w.getAttribute("lon")), nome: (w.querySelector("name")?.textContent || "Punto di interesse").trim().slice(0, 40) }))
      .filter((w) => Number.isFinite(w.lat) && Number.isFinite(w.lon));
    return { punti, wpt };
  }
  V.pitch = (id) => {
    const u = uscita(id);
    if (!u) return `<h1>Uscita non trovata</h1><a class="btn secondario" href="#uscite">Torna alle uscite</a>`;
    const b = briefing(u), g = pitchGPX[u.id], soste = tappeDi(u);
    const spunti = u.spunti.filter((s) => s.stato === "convalidato");
    return `<div class="cn-pitch">
      <div class="cn-no-stampa">
        ${indietro(`#uscita/${u.id}`, u.titolo)}
        <h1>Pitch dell'uscita</h1>
        <p class="nota">Scheda da stampare o salvare in PDF. Dati dalla tua scheda e dal GPX che carichi qui (il file non viene salvato). Nessun prezzo e nessuna mappa di terzi.</p>
        <form class="box modulo"><label for="cn-pitch-gpx">GPX per l'altimetria</label>
          <input id="cn-pitch-gpx" type="file" data-azione="cn-gpx" data-id="${u.id}">
          <p class="nota" id="cn-esito-pitch">${g ? `Letto: ${C.numero(g.tot.km)} km, +${C.numero(g.tot.dislivello)} m, ${g.tot.punti} punti.` : "I waypoint del GPX diventano i punti di interesse."}</p></form>
        <button class="btn primario" data-azione="cn-stampa">Stampa o salva in PDF</button>
      </div>
      <article class="box cn-foglio">
        <div class="riga"><strong>${esc(S.leader.marchio)}</strong><span class="nota">${esc(S.leader.titolo)} (dichiarato)</span></div>
        <div class="titolo-uscita">${esc(u.titolo)}</div>
        <div class="descrittore scuro">${esc(u.descrittore)}</div>
        <p><b>${esc(dataLunga(u.data))}</b> · ritrovo ${esc(u.oraPartenza)} a ${esc(u.ritrovo.nome)}</p>
        <div class="dati">
          <div class="dato"><b>${C.numero(u.km)} km</b><span>distanza</span></div>
          <div class="dato"><b>+${C.numero(u.dislivello)} m</b><span>dislivello</span></div>
          <div class="dato"><b>${u.dettagli.quotaMax ? C.numero(u.dettagli.quotaMax) + " m" : "—"}</b><span>quota max</span></div>
          <div class="dato"><b>${esc(u.dettagli.difficolta)}</b><span>difficoltà</span></div>
          <div class="dato"><b>${C.durata(b.ore)}</b><span>durata stimata</span></div>
          <div class="dato"><b>${C.ora(b.tram)}</b><span>tramonto</span></div>
        </div>
        <span class="eti">Altimetria</span>
        ${g && g.prof.length > 1 ? svgAltimetria(g.prof, g.poi) + `<p class="nota">Dal GPX: ${C.numero(g.tot.km)} km, +${C.numero(g.tot.dislivello)} m, quota da ${g.tot.quotaMin ?? "—"} a ${g.tot.quotaMax ?? "—"} m.</p>`
          : `<p class="nota">${g ? "Il GPX non ha le quote dei punti: altimetria non disponibile." : "Carica il GPX per disegnare l'altimetria."}</p>`}
        ${g && g.poi.length ? `<span class="eti">Punti di interesse</span><ol class="cn-scaletta">${g.poi.map((p) => `<li>${esc(p.nome)} · km ${esc(String(Math.round(p.d * 10) / 10).replace(".", ","))}${p.e !== null ? ` · ${Math.round(p.e)} m` : ""}</li>`).join("")}</ol>` : ""}
        ${soste.length ? `<span class="eti">Soste</span><ul class="cn-scaletta">${soste.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
        ${spunti.length ? `<span class="eti">Cosa vedremo</span><ul class="cn-scaletta">${spunti.map((s) => `<li>${esc(s.testo)}</li>`).join("")}</ul>` : ""}
        <p class="nota">Durata stimata con km ÷ 4 + dislivello ÷ 400, da confermare. Quota, condizioni e iscrizione: ${esc(S.leader.contatto)}.</p>
        <div class="powered"><img src="icone/icon-192.png" alt="">Powered by Gruvia</div>
      </article></div>`;
  };

  // ---------- F71 Documenti dell'uscita ----------
  const TIPI_DOC = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };
  const NOMI_VIETATI = /(carta.?d.?identit|identity|passaport|passport|patente|tessera.?sanitaria|codice.?fiscale|certificat\w*.?medic|referto|ricetta|sanitari|allerg|diagnos|cartella.?clinica)/i;
  async function tipoReale(file) {
    const b = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
    if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return "image/jpeg";
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return "image/png";
    return null;
  }
  V.documenti = (id) => {
    const u = uscita(id);
    if (!u) return `<h1>Uscita non trovata</h1><a class="btn secondario" href="#uscite">Torna alle uscite</a>`;
    const docs = u.documenti || [];
    return `${indietro(`#uscita/${u.id}`, u.titolo)}
      <h1>Documenti</h1>
      <section class="box"><span class="chip c-errore">Mai documenti sanitari o di identità</span>
        <p class="nota">Solo prenotazioni dei rifugi, assicurazione di gruppo, ricevute. Niente carte d'identità, tessere sanitarie, certificati medici o dati dei partecipanti. I file sono cifrati su questo telefono e li vedi solo tu.</p></section>
      <form class="box modulo" data-form="cn-doc" data-id="${u.id}">
        <label for="cn-doc-file">File (PDF, JPEG o PNG, massimo 5 MB)</label>
        <input id="cn-doc-file" name="file" type="file" accept="application/pdf,image/jpeg,image/png" required>
        <label for="cn-doc-desc">Descrizione</label>
        <input id="cn-doc-desc" name="descrizione" maxlength="60" placeholder="Es. Prenotazione rifugio" autocomplete="off">
        <label for="cn-doc-tappa">Tappa (facoltativa)</label>
        <input id="cn-doc-tappa" name="tappa" maxlength="60" list="cn-tappe-doc" placeholder="Intera uscita" autocomplete="off">${datalistTappe(u, "cn-tappe-doc")}
        <label class="spunta"><input type="checkbox" name="confermo" required> Confermo che non è un documento sanitario né di identità</label>
        <button class="btn primario" type="submit">Carica il documento</button>
        <p class="nota">Il file viene salvato con un nome casuale: il nome originale non si conserva.</p>
      </form>
      <section class="box"><span class="eti">Caricati</span>
        ${docs.length ? docs.map((d) => `<div class="persona"><div class="testo"><strong>${esc(d.descrizione || "Documento")}</strong>
            <span>${esc(d.nome)} · ${esc(peso(d.peso))} · ${esc(d.tappa || "Intera uscita")} · ${esc(quando(d.caricato))}</span></div>
          <div class="azioni-persona"><a class="btn secondario piccolo" data-cn-file="${esc(d.chiave)}" download="${esc(d.nome)}" target="_blank" rel="noopener">Apri</a>
            <button class="btn icona" data-azione="cn-doc-elimina" data-id="${u.id}" data-doc="${d.id}" aria-label="Elimina ${esc(d.descrizione || d.nome)}">✕</button></div></div>`).join("")
        : `<p class="nota">Nessun documento per questa uscita.</p>`}
      </section>`;
  };

  // ---------- F74 Foto dei partecipanti con consenso ----------
  async function ricodificaFoto(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Usa una foto JPEG, PNG o WebP.");
    if (file.size > MB5) throw new Error("La foto supera 5 MB: scegline una più leggera.");
    let bmp;
    try { bmp = await createImageBitmap(file); } catch (e) { throw new Error("Non riesco a leggere questa foto: prova a esportarla di nuovo in JPEG."); }
    const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const cv = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * s), height: Math.round(bmp.height * s) });
    cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height); // ridisegnare su canvas toglie gli EXIF
    return new Promise((ok, ko) => cv.toBlob((b) => (b ? ok(b) : ko(new Error("Ricodifica della foto non riuscita."))), "image/jpeg", 0.85));
  }
  const nomeP = (u, pid) => u.partecipanti.find((x) => x.id === pid)?.nome || "Persona non più in elenco";
  const sceltePersone = (u, scelte = [], nessuna = false, pref = "") => `<fieldset class="cn-persone"><legend class="eti">Persone ritratte</legend>
    ${u.partecipanti.map((p) => `<label class="spunta"><input type="checkbox" name="persone" value="${p.id}" ${scelte.includes(p.id) ? "checked" : ""}> ${esc(p.nome)} <span class="chip ${consensoFoto(p) ? "c-ok" : "c-bozza"}">${consensoFoto(p) ? "consenso sì" : "senza consenso"}</span></label>`).join("") || `<p class="nota">Nessun iscritto in questa uscita.</p>`}
    <label class="spunta"><input type="checkbox" name="nessuna" ${nessuna ? "checked" : ""}> Nessuna persona riconoscibile${pref}</label></fieldset>`;
  V.foto = (id) => {
    const u = uscita(id);
    if (!u) return `<h1>Uscita non trovata</h1><a class="btn secondario" href="#uscite">Torna alle uscite</a>`;
    const foto = u.foto || [];
    const pubbliche = foto.filter((f) => fotoPubblica(u, f)).length;
    return `${indietro(`#uscita/${u.id}`, u.titolo)}
      <h1>Foto dell'uscita</h1>
      <div class="chips"><span class="chip c-ok">${pubbliche} pubbliche</span><span class="chip c-bozza">${foto.length - pubbliche} private</span></div>
      <p class="nota">Le foto nascono private. Diventano pubbliche solo se ogni persona ritratta ha dato il consenso foto; se uno lo ritira, la foto torna privata. Metadati EXIF (posizione, dispositivo) tolti al caricamento.</p>
      <form class="box modulo" data-form="cn-foto" data-id="${u.id}">
        <label for="cn-foto-file">Foto (JPEG, PNG o WebP, massimo 5 MB)</label>
        <input id="cn-foto-file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required>
        <label for="cn-foto-tappa">Tappa (facoltativa)</label>
        <input id="cn-foto-tappa" name="tappa" maxlength="60" list="cn-tappe-foto" placeholder="Intera uscita" autocomplete="off">${datalistTappe(u, "cn-tappe-foto")}
        ${sceltePersone(u)}
        <button class="btn primario" type="submit">Carica la foto</button>
      </form>
      ${foto.map((f) => { const pub = fotoPubblica(u, f); const senza = f.persone.filter((pid) => !consensoFoto(u.partecipanti.find((x) => x.id === pid)));
        return `<section class="box">
        <img class="cn-foto" data-cn-file="${esc(f.chiave)}" alt="Foto dell'uscita${f.tappa ? ", " + esc(f.tappa) : ""}">
        <div class="riga"><span class="chip ${pub ? "c-ok" : "c-bozza"}">${pub ? "Pubblica" : "Privata"}</span><span class="nota">${esc(f.tappa || "Intera uscita")} · ${esc(quando(f.caricata))}</span></div>
        <p class="nota">${f.persone.length ? `Ritratti: ${f.persone.map((pid) => esc(nomeP(u, pid))).join(", ")}.` : f.nessunaPersona ? "Nessuna persona riconoscibile." : "Persone ritratte non indicate: resta privata."}${senza.length ? ` Manca il consenso di: ${senza.map((pid) => esc(nomeP(u, pid))).join(", ")}.` : ""}</p>
        <details><summary>Cambia le persone ritratte</summary>
          <form class="modulo cn-blocco" data-form="cn-foto-persone" data-id="${u.id}" data-foto="${f.id}">${sceltePersone(u, f.persone, f.nessunaPersona)}<button class="btn secondario piccolo" type="submit">Aggiorna</button></form></details>
        <button class="btn secondario piccolo testo-errore" data-azione="cn-foto-elimina" data-id="${u.id}" data-foto="${f.id}">Elimina la foto</button>
      </section>`; }).join("")}
      ${u.partecipanti.some(consensoFoto) ? `<section class="box"><span class="eti">Ritiro del consenso</span>
        <p class="nota">Se una persona ti chiede di ritirare il consenso foto, registralo qui: le sue foto tornano private. Il consenso lo dà solo la persona, dalla richiesta o dal suo link.</p>
        ${u.partecipanti.filter(consensoFoto).map((p) => `<div class="riga"><span>${esc(p.nome)}</span><button class="btn secondario piccolo" data-azione="cn-ritira-foto" data-id="${u.id}" data-p="${p.id}">Registra il ritiro</button></div>`).join("")}</section>` : ""}`;
  };

  // ---------- collegamenti nelle viste esistenti ----------
  const baseUscita = V.uscita;
  V.uscita = (id) => {
    const html = baseUscita(id), u = uscita(id);
    if (!u) return html;
    const apre = html.indexOf('<nav class="sottomenu" aria-label="Sezioni dell\'uscita">');
    const chiude = apre < 0 ? -1 : html.indexOf("</nav>", apre);
    if (chiude < 0) return html;
    const link = `<a href="#vocale/${u.id}">Vocale</a><a href="#pillole/${u.id}">Pillole${u.pillole?.length ? ` <b>${u.pillole.length}</b>` : ""}</a><a href="#pitch/${u.id}">Pitch</a><a href="#documenti/${u.id}">Documenti${u.documenti?.length ? ` <b>${u.documenti.length}</b>` : ""}</a><a href="#foto/${u.id}">Foto${u.foto?.length ? ` <b>${u.foto.length}</b>` : ""}</a>`;
    return html.slice(0, chiude) + link + html.slice(chiude);
  };
  const basePubblica = V.pubblica;
  V.pubblica = (id) => {
    const html = basePubblica(id), u = uscita(id);
    if (!u) return html;
    const pillole = (u.pillole || []).filter((p) => p.stato === "pubblicata" && p.visibilita === "pubblica");
    const foto = (u.foto || []).filter((f) => fotoPubblica(u, f));
    if (!pillole.length && !foto.length) return html;
    const pezzo = (pillole.length ? `<section class="box"><span class="eti">Da ascoltare</span>${pillole.map((p) => htmlPillola(p)).join("")}</section>` : "")
      + (foto.length ? `<section class="box"><span class="eti">Foto</span><div class="cn-galleria">${foto.map((f) => `<img class="cn-foto" data-cn-file="${esc(f.chiave)}" alt="Foto dell'uscita">`).join("")}</div><p class="nota">Pubblicate con il consenso di ogni persona ritratta.</p></section>` : "");
    const segno = '<form class="box modulo" data-form="richiesta"';
    return html.includes(segno) ? html.replace(segno, pezzo + segno) : html + pezzo;
  };
  function daCodice(codice) {
    for (const u of S.uscite) { const p = u.partecipanti.find((q) => q.link && q.link.codice === codice); if (p) return Date.now() > p.link.scade ? null : { u, p }; }
    return null;
  }
  const baseP = V.p;
  V.p = (codice) => {
    const html = baseP(codice), t = daCodice(codice);
    if (!t) return html;
    const { u, p } = t;
    const pillole = p.stato === "confermato" ? (u.pillole || []).filter((x) => x.stato === "pubblicata" && x.visibilita !== "leader") : [];
    const pezzo = (pillole.length ? `<section class="box"><span class="eti">Da ascoltare alle soste</span>${pillole.map((x) => htmlPillola(x)).join("")}</section>` : "")
      + `<section class="box"><span class="eti">Foto dell'uscita</span>
        <p class="nota">${consensoFoto(p) ? "Hai dato il consenso a comparire nelle foto pubblicate." : "Non hai dato il consenso: le foto in cui compari restano private."}</p>
        <button class="btn secondario" data-azione="cn-p-foto" data-codice="${esc(codice)}">${consensoFoto(p) ? "Ritira il consenso foto" : "Do il consenso foto"}</button></section>`;
    const segno = '<button class="btn secondario testo-errore" data-azione="p-disdici"';
    return html.includes(segno) ? html.replace(segno, pezzo + segno) : html + pezzo;
  };

  // ---------- eventi ----------
  const err = (id, testo) => { const el = document.getElementById(id); if (el) { el.hidden = !testo; el.textContent = testo || ""; if (testo) el.scrollIntoView({ block: "center" }); } };
  const nuovoConsensoFoto = (p, valore, da) => { p.consensi ??= []; p.consensi.push({ tipo: "foto", valore, quando: new Date().toISOString(), versione: VERSIONE_INFORMATIVA, da }); };

  document.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-azione]");
    if (!el || !String(el.dataset.azione).startsWith("cn-") || el.tagName === "INPUT") return;
    const u = el.dataset.id ? uscita(el.dataset.id) : null;
    switch (el.dataset.azione) {
      case "cn-annuncio-ricomincia": annuncio = null; mostra(); return;
      case "cn-vocale-copia": {
        if (!document.getElementById("cn-voc-letto")?.checked) { avviso("Rileggi il messaggio e spunta \"Ho riletto\" prima di copiarlo."); return; }
        const testo = document.getElementById("cn-voc-msg").value.trim();
        if (vocali[u.id]) vocali[u.id].messaggio = testo;
        S.eventi.messaggiCopiati++; salva(); copia(testo, "Messaggio copiato: incollalo nel gruppo WhatsApp"); return;
      }
      case "cn-scaletta": {
        const area = document.getElementById("cn-pl-scal");
        area.value = u.spunti.filter((s) => s.stato === "convalidato").slice(0, 3).map((s) => s.testo.slice(0, 120)).join("\n");
        document.getElementById("cn-nota-scaletta").innerHTML = `${chipAuto} Proposta dagli spunti convalidati: rileggila e correggila.`; return;
      }
      case "cn-pillola-elimina": {
        if (!conferma2(el, "Tocca di nuovo per eliminare")) return;
        if (el.dataset.dove === "profilo") { await eliminaFile(S.leader.presentazione?.audio?.chiave); delete S.leader.presentazione; salva(); location.hash = "#profilo"; mostra(); avviso("Pillola di presentazione rimossa"); return; }
        const t = trovaPillola(el.dataset.pid);
        if (t) { await eliminaFile(t.p.audio?.chiave); t.u.pillole = t.u.pillole.filter((x) => x !== t.p); salva(); location.hash = `#pillole/${t.u.id}`; mostra(); avviso("Pillola eliminata"); }
        return;
      }
      case "cn-presentazione-ritira": {
        const p = S.leader.presentazione; if (!p) return;
        p.consenso = null; p.stato = "bozza"; salva(); mostra(); avviso("Consenso ritirato: la pillola non è più nella pagina pubblica"); return;
      }
      case "cn-stampa": window.print(); return;
      case "cn-doc-elimina": {
        if (!conferma2(el, "Sicuro?")) { el.classList.add("pericolo"); return; }
        const d = (u.documenti || []).find((x) => x.id === Number(el.dataset.doc));
        if (d) { await eliminaFile(d.chiave); u.documenti = u.documenti.filter((x) => x !== d); salva(); mostra(); avviso("Documento eliminato"); }
        return;
      }
      case "cn-foto-elimina": {
        if (!conferma2(el, "Tocca di nuovo per eliminare")) return;
        const f = (u.foto || []).find((x) => x.id === Number(el.dataset.foto));
        if (f) { await eliminaFile(f.chiave); u.foto = u.foto.filter((x) => x !== f); salva(); mostra(); avviso("Foto eliminata"); }
        return;
      }
      case "cn-ritira-foto": {
        if (!conferma2(el, "Tocca di nuovo per registrare")) return;
        const p = u.partecipanti.find((x) => x.id === Number(el.dataset.p));
        if (p) { nuovoConsensoFoto(p, false, "leader"); salva(); mostra(); avviso(`Ritiro registrato: le foto di ${p.nome} sono private`); }
        return;
      }
      case "cn-p-foto": {
        const t = daCodice(el.dataset.codice);
        if (!t) { mostra(); return; }
        const nuovo = !consensoFoto(t.p);
        nuovoConsensoFoto(t.p, nuovo, "partecipante"); salva(); mostra();
        avviso(nuovo ? "Consenso foto registrato" : "Consenso ritirato: le foto in cui compari ora sono private"); return;
      }
      default: return;
    }
  });

  document.addEventListener("change", async (e) => {
    const el = e.target;
    if (el.dataset.azione === "cn-audio") {
      const f = el.files[0], form = el.form, esito = document.getElementById("cn-esito-audio");
      const errore = (t) => { esito.className = "testo-errore"; esito.textContent = t; el.value = ""; };
      if (!f) return;
      if (!/^audio\//.test(f.type)) return errore("Il file non è un audio: usa MP3, M4A, OGG, WAV o WebM.");
      if (f.size > MB5) return errore("L'audio supera 5 MB: registra una pillola più breve o esportala compressa.");
      const url = URL.createObjectURL(f);
      const durata = await new Promise((ok) => { const a = new Audio(); a.preload = "metadata"; a.onloadedmetadata = () => ok(a.duration); a.onerror = () => ok(NaN); a.src = url; });
      URL.revokeObjectURL(url);
      if (!Number.isFinite(durata)) return errore("Non riesco a leggere la durata: esporta l'audio in MP3 o M4A.");
      if (durata > 180) return errore(`L'audio dura ${Math.round(durata)} secondi: il massimo è 3 minuti.`);
      try {
        if (form.audioChiave.value) await eliminaFile(form.audioChiave.value); // sostituisce un audio appena caricato
        form.audioChiave.value = await salvaFile(f); form.audioDurata.value = durata; form.audioTipo.value = f.type;
        esito.className = "nota testo-ok"; esito.textContent = `Audio pronto: ${Math.round(durata)} secondi, ${peso(f.size)}. Si collega alla pillola quando salvi.`;
      } catch (x) { errore(x.message); }
      return;
    }
    if (el.dataset.azione === "cn-gpx") {
      const f = el.files[0], esito = document.getElementById("cn-esito-pitch");
      if (!f) return;
      if (f.size > MB5) { esito.className = "testo-errore"; esito.textContent = "Il file supera 5 MB: esporta una traccia più leggera."; return; }
      try {
        const testo = await f.text();
        const tot = C.analizzaGPX(testo), { punti, wpt } = leggiGPX(testo), pr = profiloDaPunti(punti, wpt);
        pitchGPX[Number(el.dataset.id)] = { tot, prof: pr.prof, poi: pr.poi };
        mostra();
      } catch (x) { esito.className = "testo-errore"; esito.textContent = x.message; }
    }
  });

  document.addEventListener("submit", async (e) => {
    const f = e.target, tipo = f.dataset.form || "";
    if (!tipo.startsWith("cn-")) return;
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    const u = f.dataset.id ? uscita(f.dataset.id) : null;

    if (tipo === "cn-annuncio") {
      if (!String(d.testo || "").trim()) { avviso("Incolla il testo dell'annuncio."); return; }
      annuncio = estraiAnnuncio(String(d.testo).slice(0, 3000)); mostra(); return;
    }
    if (tipo === "cn-annuncio-salva") {
      const n = (v) => (v === "" || v == null ? NaN : Number(v));
      const v = {
        titolo: String(d.titolo || "").trim().slice(0, 70), data: d.data, oraPartenza: d.oraPartenza, ritrovo: String(d.ritrovo || "").trim().slice(0, 80),
        km: n(d.km), dislivello: n(d.dislivello), prezzo: n(d.prezzo), posti: n(d.posti), difficolta: d.difficolta,
      };
      const manca = [];
      if (!v.titolo) manca.push("titolo"); if (!/^\d{4}-\d{2}-\d{2}$/.test(v.data || "")) manca.push("data"); if (!/^\d{2}:\d{2}$/.test(v.oraPartenza || "")) manca.push("ora");
      if (!v.ritrovo) manca.push("ritrovo"); if (!(v.km > 0 && v.km <= 80)) manca.push("km"); if (!(v.dislivello >= 0 && v.dislivello <= 5000)) manca.push("dislivello");
      if (!(v.prezzo >= 0 && v.prezzo <= 2000)) manca.push("prezzo"); if (!(v.posti >= 1 && v.posti <= 60)) manca.push("posti"); if (!["T", "E", "EE", "EEA"].includes(v.difficolta)) manca.push("difficoltà");
      if (manca.length) { err("cn-errori-annuncio", `Completa questi campi prima di salvare: ${manca.join(", ")}.`); return; }
      const id = nuovoId();
      S.uscite.push({
        id, titolo: v.titolo, descrittore: "trekking", data: v.data, oraPartenza: v.oraPartenza, ritrovo: { nome: v.ritrovo, lat: 43.1, lon: 12.4 },
        km: v.km, dislivello: Math.round(v.dislivello), attivita: "trekking", lingua: "it", dettagli: { difficolta: v.difficolta, quotaMax: null },
        prezzo: v.prezzo, posti: Math.round(v.posti), minimo: 0, condizioni: String(d.condizioni || "").trim().slice(0, 400), spese: [],
        stato: "bozza", consultazioni: [], presenze: {}, spunti: [], partecipanti: [], origine: "annuncio",
      });
      S.eventi.usciteCreate++; annuncio = null; salva();
      location.hash = `#uscita/${id}`; avviso("Bozza salvata dall'annuncio: controlla e completa le condizioni"); return;
    }
    if (tipo === "cn-vocale") {
      const tr = String(d.trascrizione || "").trim().slice(0, 3000);
      if (!tr) { avviso("Scrivi o incolla la trascrizione del vocale."); return; }
      const r = riordinaVocale(tr, { titolo: u.titolo, data: dataLunga(u.data), ora: u.oraPartenza, ritrovo: `Ritrovo a ${u.ritrovo.nome}`, firma: (S.leader.nome || "").split(" ")[0] });
      vocali[u.id] = { trascrizione: tr, messaggio: r.testo, dallaScheda: r.dallaScheda }; mostra(); return;
    }
    if (tipo === "cn-pillola") {
      const azione = e.submitter?.value === "pubblica" ? "pubblica" : "bozza";
      const profilo = f.dataset.dove === "profilo";
      const casa = profilo ? null : uscita(f.dataset.dove.slice(1));
      let p = profilo ? S.leader.presentazione : f.dataset.pid ? trovaPillola(f.dataset.pid)?.p : null;
      const nuova = !p;
      const valori = {
        titolo: String(d.titolo || "").trim().slice(0, 80), testo: String(d.testo || "").trim().slice(0, 1500),
        trascrizione: String(d.trascrizione || "").trim().slice(0, 5000), scaletta: String(d.scaletta || "").split("\n").map((r) => r.trim().slice(0, 120)).filter(Boolean).slice(0, 8),
        fonte: String(d.fonte || "").trim().slice(0, 200), soloVoce: !!d.soloVoce, visibilita: profilo ? "pubblica" : (VISIBILITA[d.visibilita] ? d.visibilita : "leader"),
        en: { titolo: String(d.enTitolo || "").trim().slice(0, 80), testo: String(d.enTesto || "").trim().slice(0, 1500), trascrizione: String(d.enTrascrizione || "").trim().slice(0, 5000), verificata: !!d.enVerificata },
      };
      const audioNuovo = d.audioChiave ? { chiave: d.audioChiave, durata: Number(d.audioDurata) || 0, tipo: d.audioTipo } : null;
      const audioFinale = audioNuovo || (d.togliAudio ? null : p?.audio || null);
      const errori = [];
      if (!valori.titolo) errori.push("scrivi il titolo");
      if (azione === "pubblica") {
        if (!valori.testo) errori.push("scrivi il testo");
        if (!valori.trascrizione) errori.push("senza trascrizione la pillola non si pubblica");
        if (audioFinale && !valori.soloVoce) errori.push("conferma che l'audio contiene solo la tua voce");
        if (profilo && !d.consenso) errori.push("serve il tuo consenso per mostrarla nella pagina pubblica");
      }
      if (errori.length) { err("cn-errori-pillola", `Per ${azione === "pubblica" ? "pubblicare" : "salvare"}: ${errori.join("; ")}.`); return; }
      if (nuova) { p = nuovaPillola(); p.id = nuovoId(); }
      if (p.audio && p.audio.chiave !== audioFinale?.chiave) await eliminaFile(p.audio.chiave);
      Object.assign(p, valori, { audio: audioFinale, stato: azione === "pubblica" ? "pubblicata" : "bozza", aggiornata: new Date().toISOString() });
      if (profilo) {
        p.consenso = d.consenso ? (p.consenso || { quando: new Date().toISOString(), versione: VERSIONE_INFORMATIVA }) : null;
        S.leader.presentazione = p;
      } else if (nuova) { casa.pillole ??= []; casa.pillole.push(p); }
      salva(); location.hash = profilo ? "#profilo" : `#pillole/${(casa || trovaPillola(p.id).u).id}`;
      avviso(azione === "pubblica" ? "Pillola pubblicata" : "Pillola salvata come bozza"); return;
    }
    if (tipo === "cn-doc") {
      const file = f.file.files[0];
      if (!d.confermo) { avviso("Conferma che non è un documento sanitario né di identità."); return; }
      if (!file) { avviso("Scegli un file da caricare."); return; }
      if (NOMI_VIETATI.test(file.name) || NOMI_VIETATI.test(d.descrizione || "")) { avviso("Sembra un documento sanitario o di identità: questi documenti non si caricano."); return; }
      if (file.size > MB5) { avviso("Il file supera 5 MB: comprimilo o caricane una parte."); return; }
      const mime = await tipoReale(file);
      if (!mime || !TIPI_DOC[mime]) { avviso("Formato non ammesso: carica un PDF, un JPEG o un PNG."); return; }
      try {
        const chiave = await salvaFile(new Blob([file], { type: mime }));
        u.documenti ??= [];
        u.documenti.push({ id: nuovoId(), chiave, nome: `doc-${codiceCasuale().slice(0, 10)}.${TIPI_DOC[mime]}`, tipo: mime, peso: file.size,
          descrizione: String(d.descrizione || "").trim().slice(0, 60), tappa: String(d.tappa || "").trim().slice(0, 60), caricato: new Date().toISOString() });
        salva(); mostra(); avviso("Documento caricato e cifrato");
      } catch (x) { avviso(x.message || "Caricamento non riuscito: riprova."); }
      return;
    }
    if (tipo === "cn-foto") {
      const file = f.file.files[0];
      if (!file) { avviso("Scegli una foto da caricare."); return; }
      try {
        const blob = await ricodificaFoto(file), chiave = await salvaFile(blob);
        const persone = new FormData(f).getAll("persone").map(Number).filter((pid) => u.partecipanti.some((x) => x.id === pid));
        u.foto ??= [];
        u.foto.push({ id: nuovoId(), chiave, persone, nessunaPersona: !persone.length && !!d.nessuna, tappa: String(d.tappa || "").trim().slice(0, 60), caricata: new Date().toISOString() });
        salva(); mostra(); avviso("Foto caricata, senza metadati");
      } catch (x) { avviso(x.message || "Caricamento non riuscito: riprova."); }
      return;
    }
    if (tipo === "cn-foto-persone") {
      const ft = (u.foto || []).find((x) => x.id === Number(f.dataset.foto));
      if (!ft) return;
      ft.persone = new FormData(f).getAll("persone").map(Number).filter((pid) => u.partecipanti.some((x) => x.id === pid));
      ft.nessunaPersona = !ft.persone.length && !!d.nessuna;
      salva(); mostra(); avviso(fotoPubblica(u, ft) ? "Aggiornata: la foto è pubblica" : "Aggiornata: la foto resta privata");
    }
  });
})();
