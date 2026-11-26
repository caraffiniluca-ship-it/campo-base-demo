"use strict";
// Modulo partecipante (Fase 1B e 1C), lato link personale #p/CODICE e relative viste del leader.
// F09 Conferma a 48 e 24 ore · F27 Arrivi e partenze · F28 Esigenze con consenso · F32 Lista d'attesa
// F36 Passaggi al ritrovo · F50 Concierge a regole (nessuna AI esterna: risponde solo con i dati della scheda).
// Rotte nuove: #arrivi/ID e #domande/ID (leader), #posto/CODICE (pubblica, offerta della lista d'attesa).

// ---------- costanti ----------
const PT_ESIGENZE = ["vegetariano", "vegano", "celiaco", "allergia alimentare", "mobilità ridotta", "altro"];
const PT_MEZZI = ["auto propria", "passaggio", "treno", "autobus", "bici o a piedi", "altro"];
// Stessa checklist mostrata nella pagina personale di app.js: il Concierge la riporta così com'è.
const PT_CHECKLIST = ["Scarponi da escursionismo", "Giacca impermeabile e uno strato caldo", "1,5 litri d'acqua e pranzo al sacco", "Documento e tessera sanitaria"];
const PT_ORE_OFFERTA = 24;
const ptChat = {}; // conversazioni del Concierge: solo in memoria, non si salvano

// ---------- funzioni pure ----------
// Fascia di mezz'ora di un orario "H:MM" o "HH:MM": "08:30–09:00".
function ptFascia(ora) {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(String(ora || "").trim());
  if (!m) return null;
  const min = Number(m[1]) * 60 + Number(m[2]);
  if (min < 0 || min >= 1440) return null;
  const da = Math.floor(min / 30) * 30, a = da + 30;
  const f = (x) => `${String(Math.floor(x / 60) % 24).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
  return `${f(da)}–${f(a)}`;
}
// Raggruppa per fascia: [{fascia, persone:[...]}] ordinate per orario.
function ptRaggruppa(voci) {
  const g = {};
  for (const v of voci) { const k = ptFascia(v.ora); if (k) (g[k] ??= []).push(v); }
  return Object.keys(g).sort().map((k) => ({ fascia: k, persone: g[k].sort((a, b) => ptMinuti(a.ora) - ptMinuti(b.ora)) }));
}
const ptMinuti = (ora) => { const m = /^(\d{1,2})[:.](\d{2})$/.exec(String(ora || "")); return m ? Number(m[1]) * 60 + Number(m[2]) : 0; };
// Finestra di conferma F09: ore mancanti alla partenza → "48", "24" o null se l'uscita è già partita.
function ptFinestra(oreMancanti) {
  if (oreMancanti <= 0) return null;
  return oreMancanti <= 24 ? "24" : "48";
}

// F50: risposta a regole costruita SOLO dai dati della scheda. Restituisce {testo, fonte, inoltra}.
// dati = { titolo, data (testo), oraPartenza, ritrovo, km, dislivello, quotaMax, difficolta, prezzo, condizioni,
//          durata, rientro, liberi, checklist[], sicurezza: {testo, data} | null, leader }
function ptRispondi(domanda, dati) {
  const q = String(domanda || "").toLowerCase();
  const ha = (...p) => p.some((x) => q.includes(x));
  const nonSo = { testo: `Non lo so, giro la domanda a ${dati.leader}.`, fonte: "nessuna: domanda inoltrata", inoltra: true };
  // Sicurezza: solo il testo del leader, con la data; altrimenti non lo so.
  if (ha("sicur", "pericol", "emergen", "soccors", "rischi", "espost", "vertigin", "incident", "caduta", "fulmin", "temporale", "112")) {
    return dati.sicurezza && dati.sicurezza.testo
      ? { testo: `${dati.leader} ha scritto il ${dati.sicurezza.data}: “${dati.sicurezza.testo}”`, fonte: "testo del leader sulla sicurezza", inoltra: false }
      : nonSo;
  }
  // Salute e meteo: mai una risposta automatica.
  if (ha("salut", "medic", "farmac", "malatt", "cuore", "gravidanz", "incint", "asma", "diabet", "meteo", "pioggia", "neve", "vento", "previsio")) return nonSo;
  const parti = [];
  if (ha("ritrovo", "dove ci", "dove si", "appuntamento", "parcheggi", "punto di incontro", "dove part")) parti.push(`Ritrovo a ${dati.ritrovo}, alle ${dati.oraPartenza} di ${dati.data}.`);
  if (ha("orari", "a che ora", "che ora", "quando", "partenza", "si parte", "rientr", "torn", "finisce", "durata", "quanto dura", "ore di cammino")) parti.push(`Partenza alle ${dati.oraPartenza} di ${dati.data}. Durata stimata ${dati.durata}, rientro previsto verso le ${dati.rientro} (stima: km ÷ 4 + dislivello ÷ 400).`);
  if (ha("km", "chilometr", "distanz", "lungh", "quanto si cammina")) parti.push(`Il percorso è di ${dati.km} km.`);
  if (ha("dislivell", "salita", "altitudin", "quota max", "quota massima", "quanto si sale")) parti.push(`Dislivello +${dati.dislivello} m${dati.quotaMax ? `, quota massima ${dati.quotaMax} m` : ""}.`);
  if (ha("difficol", "difficile", "impegnativ", "facile", "allenat")) parti.push(`Difficoltà ${dati.difficolta} (scala CAI), come indicato nella scheda.`);
  if (ha("prezzo", "costo", "costa", "quanto si paga", "pagare", "euro", "€", "quota di partecipazione", "quota a persona")) parti.push(`Il prezzo è ${dati.prezzo} a persona.`);
  if (ha("annull", "rimbors", "disdir", "disdett", "condizion", "se non vengo", "se piove")) parti.push(`Condizioni di annullamento: ${dati.condizioni}`);
  if (ha("checklist", "cosa porto", "cosa portare", "devo portare", "cosa serve", "attrezzatur", "equipaggiament", "zaino", "scarpe", "scarponi", "vestir", "pranzo al sacco")) parti.push(`Checklist della scheda: ${dati.checklist.join("; ")}.`);
  if (ha("posti", "pieno", "posto libero", "c'è posto")) parti.push(dati.liberi > 0 ? `Ci sono ${dati.liberi} posti liberi.` : "L'uscita è al completo: puoi metterti in lista d'attesa.");
  return parti.length ? { testo: parti.join("\n"), fonte: "scheda dell'uscita", inoltra: false } : nonSo;
}

// ---------- utilità sui dati (usano i globali di app.js) ----------
const ptOggi = () => new Date().toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
const ptQuando = (ms) => new Date(ms).toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const ptInizio = (u) => new Date(`${u.data}T${u.oraPartenza || "09:00"}`);
const ptOreMancanti = (u) => (ptInizio(u) - Date.now()) / 3600000;
const ptNome = (p) => p.nome.split(" ")[0];
const ptLeader = () => (S.leader.nome || "il leader").split(" ")[0];
const ptUrl = (frammento) => `${location.origin}${location.pathname}#${frammento}`;

// Il partecipante si riconosce solo dal codice del suo link (128 bit), mai da un id.
function ptDaCodice(codice) {
  if (!codice) return null;
  for (const u of S.uscite) {
    const p = u.partecipanti.find((q) => q.link && q.link.codice === codice);
    if (p) return Date.now() > p.link.scade ? null : { u, p };
  }
  return null;
}
function ptDaOfferta(codice) {
  if (!codice) return null;
  for (const u of S.uscite) {
    const p = u.partecipanti.find((q) => q.offerta && q.offerta.codice === codice);
    if (p) return { u, p };
    // Chi rinuncia esce dalla lista: il codice resta riconosciuto per dire che l'offerta è chiusa.
    if ((u.ptRinunce || []).some((r) => r.codice === codice)) return { u, p: { nome: "", stato: "rinuncia", offerta: { stato: "rifiutata", codice } } };
  }
  return null;
}
// Link personale valido (lo stesso formato di app.js: scade il giorno dopo l'uscita).
function ptLinkPersonale(u, p) {
  if (!p.link || Date.now() > p.link.scade) {
    const fine = new Date(u.data + "T23:59"); fine.setDate(fine.getDate() + 1);
    p.link = { codice: codiceCasuale(), scade: fine.getTime() };
  }
  return p.link.codice;
}
function ptDatiScheda(u) {
  const b = briefing(u), liberi = u.posti - conti(u).confermati;
  return {
    titolo: u.titolo, data: dataLunga(u.data), oraPartenza: u.oraPartenza, ritrovo: u.ritrovo.nome,
    km: C.numero(u.km), dislivello: C.numero(u.dislivello), quotaMax: u.dettagli.quotaMax ? C.numero(u.dettagli.quotaMax) : null,
    difficolta: u.dettagli.difficolta, prezzo: C.euro(u.prezzo), condizioni: u.condizioni, durata: C.durata(b.ore), rientro: C.ora(b.rientro),
    liberi, checklist: PT_CHECKLIST, sicurezza: u.sicurezza ? { testo: u.sicurezza.testo, data: new Date(u.sicurezza.data).toLocaleDateString("it-IT") } : null,
    leader: ptLeader(),
  };
}

// ---------- F32: lista d'attesa ----------
const ptLista = (u) => u.partecipanti.filter((p) => p.stato === "lista");
const ptOfferteAttive = (u) => ptLista(u).filter((p) => p.offerta && p.offerta.stato === "attiva" && Date.now() <= p.offerta.scade);
const ptLiberiPerLista = (u) => u.posti - conti(u).confermati - ptOfferteAttive(u).length;
// Offerte scadute: la persona passa in fondo alla lista e non riceve offerte automatiche finché il leader non la ripropone.
function ptScadenze(u) {
  let cambiato = false;
  for (const p of ptLista(u)) {
    if (p.offerta && p.offerta.stato === "attiva" && Date.now() > p.offerta.scade) {
      p.offerta.stato = "scaduta"; cambiato = true;
      u.partecipanti.splice(u.partecipanti.indexOf(p), 1); u.partecipanti.push(p);
    }
  }
  return cambiato;
}
function ptOffri(u, p) {
  const scade = Math.min(Date.now() + PT_ORE_OFFERTA * 3600000, ptInizio(u).getTime());
  p.offerta = { codice: codiceCasuale(), scade, stato: "attiva", dal: Date.now() };
  return p;
}
// Quando un posto si libera, il primo in lista senza offerte precedenti riceve il link.
function ptOffriAutomatico(u) {
  const offerti = [];
  if (ptOreMancanti(u) <= 0) return offerti;
  ptScadenze(u);
  for (const p of ptLista(u)) {
    if (ptLiberiPerLista(u) <= 0) break;
    if (!p.offerta) offerti.push(ptOffri(u, p));
  }
  return offerti;
}
const ptTestoOfferta = (u, p) => `Ciao ${ptNome(p)}, si è liberato un posto per ${u.titolo} (${dataBreve(u.data)}). Il link vale fino a ${ptQuando(p.offerta.scade)}: ${ptUrl("posto/" + p.offerta.codice)}`;

// ---------- pulizia automatica (F28, F32, F50) ----------
function ptPulizia() {
  let cambiato = false;
  for (const u of S.uscite) {
    const g = giorniA(u.data);
    if (g < 0) {
      for (const p of u.partecipanti) {
        // F28: le esigenze si cancellano a fine uscita, senza attendere i giorni di conservazione.
        if (p.esigenza) { delete p.esigenza; cambiato = true; }
        if (p.passaggio) { delete p.passaggio; cambiato = true; }
        if (p.offerta) { delete p.offerta; cambiato = true; }
      }
      // F32: i dati della lista d'attesa si cancellano dopo l'uscita.
      const prima = u.partecipanti.length;
      u.partecipanti = u.partecipanti.filter((p) => p.stato !== "lista");
      if (u.partecipanti.length !== prima) cambiato = true;
    } else if (ptScadenze(u)) cambiato = true;
    if (g < -CONSERVAZIONE_GIORNI && (u.domandeAperte?.length || u.ptDisdette?.length || u.ptRinunce?.length)) { u.domandeAperte = []; u.ptDisdette = []; u.ptRinunce = []; cambiato = true; }
  }
  if (cambiato) salva();
}

// ---------- pezzi della pagina personale ----------
function ptBoxConferma(u, p, codice) {
  const ore = ptOreMancanti(u), fin = ptFinestra(ore);
  if (!fin || p.stato !== "confermato") return "";
  const fatta = p.conferme?.[fin];
  const apertura48 = new Date(ptInizio(u).getTime() - 48 * 3600000);
  return `<section class="box" id="pt-conferma"><div class="riga"><span class="eti">Conferma la presenza · ${fin} ore</span>${fatta ? `<span class="chip c-ok">Confermato</span>` : `<span class="chip c-attenzione">Da confermare</span>`}</div>
    <p>Mancano ${ore > 48 ? Math.round(ore / 24) + " giorni" : Math.max(1, Math.round(ore)) + " ore"} alla partenza. Conferma che ci sarai o libera il posto con un tocco.</p>
    ${ore > 48 ? `<p class="nota">Nell'app vera questi pulsanti compaiono da 48 ore prima (${esc(ptQuando(apertura48.getTime()))}) e di nuovo a 24 ore. Nella demo sono sempre visibili e valgono per la finestra delle 48 ore.</p>` : ""}
    ${fatta ? `<p class="testo-ok">Hai confermato il ${esc(new Date(fatta.quando).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }))}.</p>` : ""}
    ${fatta ? "" : `<button class="btn primario" data-azione="pt-confermo" data-codice="${esc(codice)}">Confermo</button>`}
    <button class="btn secondario testo-errore" data-azione="pt-disdico" data-codice="${esc(codice)}">Non posso più venire</button>
    <p class="nota">Se disdici, il posto passa al primo in lista d'attesa. Condizioni: ${esc(u.condizioni)}</p></section>`;
}

function ptBoxViaggio(u, p, codice) {
  if (p.stato !== "confermato") return "";
  if (u.arriviGestiti) return `<section class="box"><span class="eti">Arrivi e partenze</span><p class="nota">Arrivi e partenze li organizza ${esc(ptLeader())}: segui le sue indicazioni.</p></section>`;
  const v = p.viaggio;
  return `<section class="box"><div class="riga"><span class="eti">Come arrivi</span>${v ? `<span class="chip c-ok">Indicato</span>` : ""}</div>
    ${v ? `<p>${esc(v.mezzo)}, al ritrovo alle ${esc(v.arrivo)}${v.da ? ` da ${esc(v.da)}` : ""}${v.ripartenza ? ` · riparti alle ${esc(v.ripartenza)}` : ""}.</p>` : `<p class="nota">Serve a ${esc(ptLeader())} per sapere chi arriva e quando. Non è un obbligo.</p>`}
    <form class="modulo" data-form="pt-viaggio" data-codice="${esc(codice)}">
      <label for="pt-mezzo">Mezzo</label>
      <select id="pt-mezzo" name="mezzo">${PT_MEZZI.map((m) => `<option ${v?.mezzo === m ? "selected" : ""}>${m}</option>`).join("")}</select>
      <div class="due"><div><label for="pt-arrivo">Arrivo al ritrovo *</label><input id="pt-arrivo" name="arrivo" type="time" required value="${esc(v?.arrivo || "")}"></div>
        <div><label for="pt-riparto">Ripartenza (facoltativa)</label><input id="pt-riparto" name="ripartenza" type="time" value="${esc(v?.ripartenza || "")}"></div></div>
      <label for="pt-da">Da dove arrivi</label>
      <input id="pt-da" name="da" maxlength="40" autocomplete="off" placeholder="Es. Perugia, stazione" value="${esc(v?.da || "")}">
      <button class="btn secondario" type="submit">${v ? "Aggiorna" : "Salva"}</button>
    </form></section>`;
}

function ptBoxPassaggi(u, p, codice) {
  if (p.stato !== "confermato" || u.arriviGestiti) return "";
  const mio = p.passaggio;
  const altri = u.partecipanti.filter((q) => q !== p && q.stato === "confermato" && q.passaggio && q.passaggio.consenso);
  return `<section class="box"><span class="eti">Passaggi al ritrovo</span>
    <p class="nota">I passaggi sono accordi privati tra partecipanti: ${esc(ptLeader())} e Campo Base non ne rispondono (orari, spese, assicurazione dell'auto).</p>
    ${altri.length ? altri.map((q) => `<div class="riga"><span><b>${esc(q.nome)}</b> ${q.passaggio.tipo === "offro" ? `offre ${q.passaggio.posti} ${q.passaggio.posti === 1 ? "posto" : "posti"}` : "cerca un passaggio"}${q.passaggio.da ? ` da ${esc(q.passaggio.da)}` : ""}</span><span>${esc(q.passaggio.contatto)}</span></div>`).join("") : `<p class="nota">Per ora nessuno offre o cerca un passaggio.</p>`}
    ${mio ? `<p class="testo-ok">${mio.tipo === "offro" ? `Offri ${mio.posti} ${mio.posti === 1 ? "posto" : "posti"}` : "Cerchi un passaggio"}${mio.da ? ` da ${esc(mio.da)}` : ""}. Contatto visibile agli altri iscritti: ${esc(mio.contatto)} (consenso del ${esc(new Date(mio.consenso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }))}).</p>
      <button class="btn secondario" data-azione="pt-passaggio-ritira" data-codice="${esc(codice)}">Ritira e nascondi il contatto</button>`
    : `<form class="modulo" data-form="pt-passaggio" data-codice="${esc(codice)}">
      <label class="spunta"><input type="radio" name="tipo" value="offro" required> Offro un passaggio</label>
      <label class="spunta"><input type="radio" name="tipo" value="cerco"> Cerco un passaggio</label>
      <div class="due"><div><label for="pt-posti">Posti offerti</label><input id="pt-posti" name="posti" type="number" min="1" max="8" value="1"></div>
        <div><label for="pt-pda">Da dove</label><input id="pt-pda" name="da" maxlength="40" autocomplete="off" value="${esc(p.viaggio?.da || "")}"></div></div>
      <label for="pt-contatto">Contatto da mostrare *</label>
      <input id="pt-contatto" name="contatto" required maxlength="40" autocomplete="off" placeholder="Es. WhatsApp 333 000 0000">
      <label class="spunta"><input type="checkbox" name="consenso"> Acconsento che nome e contatto siano visibili agli altri iscritti confermati di questa uscita. Informativa versione ${esc(VERSIONE_INFORMATIVA)}.</label>
      <button class="btn secondario" type="submit">Pubblica</button>
    </form>`}</section>`;
}

function ptBoxEsigenze(u, p, codice) {
  if (!["confermato", "richiesta"].includes(p.stato)) return "";
  const e = p.esigenza;
  if (e) {
    const quando = /^\d{4}-\d{2}-\d{2}$/.test(e.consenso) ? new Date(e.consenso + "T12:00").toLocaleDateString("it-IT") : new Date(e.consenso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
    return `<section class="box"><div class="riga"><span class="eti">Esigenze</span><span class="chip c-info">Solo ${esc(ptLeader())} le vede</span></div>
      <p><b>${esc(e.etichetta)}</b>${e.nota ? ` · ${esc(e.nota)}` : ""}</p>
      <p class="nota">Consenso dato il ${esc(quando)}${e.versione ? `, informativa ${esc(e.versione)}` : ""}. Si cancellano da sole alla fine dell'uscita.</p>
      <button class="btn secondario testo-errore" data-azione="pt-esigenza-revoca" data-codice="${esc(codice)}">Revoca il consenso e cancella</button></section>`;
  }
  return `<section class="box"><div class="riga"><span class="eti">Esigenze (facoltative)</span><span class="chip c-info">Solo ${esc(ptLeader())} le vede</span></div>
    <form class="modulo" data-form="pt-esigenza" data-codice="${esc(codice)}">
      ${PT_ESIGENZE.map((x) => `<label class="spunta"><input type="checkbox" name="etichetta" value="${esc(x)}"> ${esc(x.charAt(0).toUpperCase() + x.slice(1))}</label>`).join("")}
      <label for="pt-enota">Precisazione breve (facoltativa)</label>
      <input id="pt-enota" name="nota" maxlength="60" autocomplete="off" placeholder="Es. frutta a guscio">
      <p class="nota">Bastano le etichette: non scrivere diagnosi, farmaci o certificati.</p>
      <label class="spunta"><input type="checkbox" name="consenso"> Acconsento che ${esc(S.leader.nome)}, titolare del trattamento, usi queste informazioni solo per organizzare questa uscita. Le vede solo lui, si cancellano alla fine dell'uscita e posso revocare il consenso da qui. Informativa versione ${esc(VERSIONE_INFORMATIVA)}.</label>
      <p class="testo-errore" id="pt-errore-esigenza" hidden></p>
      <button class="btn secondario" type="submit">Invia a ${esc(ptLeader())}</button>
    </form></section>`;
}

// F50: casella del Concierge; chiave = codice personale o "u"+id per la pagina pubblica.
function ptConcierge(u, chiave, codice) {
  const chat = ptChat[chiave] || [];
  return `<section class="box" id="pt-concierge"><div class="riga"><span class="eti">Fai una domanda</span><span class="chip c-ai">✦ Automatico</span></div>
    <p class="nota">Risposte automatiche costruite solo con i dati di questa scheda (ritrovo, orari, km, dislivello, prezzo, condizioni, checklist). Sulla sicurezza riporta solo il testo di ${esc(ptLeader())}. Se non sa, inoltra la domanda senza il tuo nome.</p>
    ${chat.length ? `<div class="chat">${chat.map((m) => m.da === "io"
      ? `<div class="msg io"><div class="bolla">${esc(m.testo)}</div></div>`
      : `<div class="msg bot"><div class="bolla">${esc(m.testo)}<span class="fonte">Risposta automatica · fonte: ${esc(m.fonte)}</span></div></div>`).join("")}</div>` : ""}
    <form class="in-linea" data-form="pt-domanda" data-id="${u.id}" data-chiave="${esc(chiave)}" data-codice="${esc(codice || "")}">
      <label class="visuale-nascosta" for="pt-dom">La tua domanda</label>
      <input id="pt-dom" name="domanda" maxlength="200" autocomplete="off" placeholder="Es. a che ora si rientra?">
      <button class="btn primario" type="submit">Chiedi</button>
    </form></section>`;
}

// ---------- viste esistenti avvolte ----------
const ptVistaP = V.p;
V.p = (codice) => {
  ptPulizia();
  let html = ptVistaP(codice);
  const t = ptDaCodice(codice);
  if (!t) return html;
  const { u, p } = t;
  // Il box F09 sostituisce il pulsante di disdetta generico solo per chi ha il posto confermato.
  if (p.stato === "confermato" && ptFinestra(ptOreMancanti(u))) html = html.replace(/<button class="btn secondario testo-errore" data-azione="p-disdici"[^>]*>Non posso più venire<\/button>/, "");
  const segnoChecklist = '<section class="box"><span class="eti">Checklist dell\'attrezzatura</span>';
  html = html.includes(segnoChecklist) ? html.replace(segnoChecklist, ptBoxConferma(u, p, codice) + segnoChecklist) : html;
  const coda = ptBoxViaggio(u, p, codice) + ptBoxPassaggi(u, p, codice) + ptBoxEsigenze(u, p, codice) + ptConcierge(u, codice, codice);
  const segnoFine = '<p class="nota">Questo link è solo tuo';
  return html.includes(segnoFine) ? html.replace(segnoFine, coda + segnoFine) : html + coda;
};

const ptVistaPubblica = V.pubblica;
V.pubblica = (id) => {
  const html = ptVistaPubblica(id), u = uscita(id);
  if (!u || u.stato === "bozza") return html;
  const segno = '<form class="box modulo" data-form="richiesta"';
  const box = ptConcierge(u, "u" + u.id, "");
  return html.includes(segno) ? html.replace(segno, box + segno) : html + box;
};

const ptVistaUscita = V.uscita;
V.uscita = (id) => {
  const html = ptVistaUscita(id), u = uscita(id);
  if (!u) return html;
  const n = (u.domandeAperte || []).filter((d) => !d.gestita).length;
  const link = `<a href="#arrivi/${u.id}">Arrivi</a><a href="#domande/${u.id}">Domande${n ? ` <b>${n}</b>` : ""}</a>`;
  const segno = `<a href="#modifica/${u.id}">Modifica</a>`;
  if (html.includes(segno)) return html.replace(segno, link + segno);
  const nav = '<nav class="sottomenu" aria-label="Sezioni dell\'uscita">';
  return html.includes(nav) ? html.replace(nav, nav + link) : html;
};

const ptVistaPartecipanti = V.partecipanti;
V.partecipanti = (id) => {
  ptPulizia();
  const html = ptVistaPartecipanti(id), u = uscita(id);
  if (!u || !u.partecipanti.length) return html;
  const conf = u.partecipanti.filter((p) => p.stato === "confermato");
  const fin = ptFinestra(ptOreMancanti(u));
  const chipConf = (p, f) => {
    const c = p.conferme?.[f];
    return c ? `<span class="chip c-ok">${f} h ✓ ${esc(new Date(c.quando).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }))}</span>` : `<span class="chip c-bozza">${f} h —</span>`;
  };
  const boxConferme = conf.length ? `<section class="box"><div class="riga"><span class="eti">Conferme a 48 e 24 ore</span><span class="chip ${conf.every((p) => fin && p.conferme?.[fin]) ? "c-ok" : "c-attenzione"}">${conf.filter((p) => fin && p.conferme?.[fin]).length}/${conf.length} per le ${fin || "—"} h</span></div>
    ${conf.map((p) => `<div class="persona"><div class="testo"><strong>${esc(p.nome)}</strong><span class="chips">${chipConf(p, "48")}${chipConf(p, "24")}</span></div>
      ${fin && !p.conferme?.[fin] ? `<button class="btn secondario piccolo" data-azione="pt-copia-conferma" data-id="${u.id}" data-p="${p.id}" aria-label="Copia la richiesta di conferma per ${esc(p.nome)}">Copia richiesta</button>` : ""}</div>`).join("")}
    ${(u.ptDisdette || []).length ? `<p class="nota">Disdette dal link: ${u.ptDisdette.map((d) => `${esc(d.nome)} (${esc(new Date(d.quando).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }))}${d.finestra ? `, finestra ${esc(d.finestra)} h` : ""})`).join(", ")}.</p>` : ""}
    <p class="nota">La richiesta contiene il link personale: la persona conferma o disdice con un tocco.</p></section>` : "";
  const lista = ptLista(u), liberi = ptLiberiPerLista(u);
  const prossimo = lista.find((p) => !(p.offerta && p.offerta.stato === "attiva"));
  const statoOfferta = (p) => {
    const o = p.offerta;
    if (!o) return `<span>In attesa</span>`;
    if (o.stato === "attiva") return `<span class="testo-attenzione">Offerto a ${esc(ptNome(p))} fino a ${esc(ptQuando(o.scade))}</span>`;
    if (o.stato === "scaduta") return `<span>Offerta scaduta senza risposta</span>`;
    return `<span>Ha rinunciato</span>`;
  };
  const boxLista = lista.length ? `<section class="box"><div class="riga"><span class="eti">Lista d'attesa</span><span class="chip c-info">${Math.max(0, liberi)} posti da offrire</span></div>
    ${lista.map((p, i) => `<div class="persona"><div class="testo"><strong>${i + 1}. ${esc(p.nome)}</strong>${statoOfferta(p)}</div>
      ${p.offerta?.stato === "attiva" ? `<button class="btn secondario piccolo" data-azione="pt-copia-offerta" data-id="${u.id}" data-p="${p.id}">Copia il link</button>` : ""}</div>`).join("")}
    ${liberi > 0 && prossimo ? `<button class="btn primario" data-azione="pt-offri" data-id="${u.id}" data-p="${prossimo.id}">Offri il posto a ${esc(prossimo.nome)} (link ${PT_ORE_OFFERTA} h)</button>` : ""}
    <p class="nota">Quando qualcuno disdice dal suo link, il primo in lista riceve in automatico un'offerta valida ${PT_ORE_OFFERTA} ore. Se scade, passa in fondo alla lista. I dati della lista si cancellano dopo l'uscita.</p></section>` : "";
  const segno = '<p class="nota">🔗 copia il link personale';
  return html.includes(segno) ? html.replace(segno, boxConferme + boxLista + segno) : html + boxConferme + boxLista;
};

// ---------- nuove schermate del leader ----------
V.arrivi = (id) => {
  const u = uscita(id);
  if (!u) return nonTrovata();
  const conf = u.partecipanti.filter((p) => p.stato === "confermato");
  const arrivo = (p) => p.viaggio?.arrivo || (/(\d{1,2}[:.]\d{2})/.exec(p.arrivo || "") || [])[1];
  const voci = conf.filter(arrivo).map((p) => ({ nome: p.nome, ora: arrivo(p).replace(".", ":"), mezzo: p.viaggio?.mezzo || (p.arrivo || "").split(",")[0], da: p.viaggio?.da || "" }));
  const ritorni = conf.filter((p) => p.viaggio?.ripartenza).map((p) => ({ nome: p.nome, ora: p.viaggio.ripartenza, mezzo: p.viaggio.mezzo, da: p.viaggio.da }));
  const senza = conf.filter((p) => !arrivo(p));
  const gruppi = (g) => g.length ? g.map((x) => `<div class="spunto"><div class="riga"><b>${esc(x.fascia)}</b><span class="chip c-info">${x.persone.length} ${x.persone.length === 1 ? "persona" : "persone"}</span></div>
    <p class="nota">${x.persone.map((v) => `${esc(v.nome)} (${esc(v.ora)}, ${esc(v.mezzo)}${v.da ? `, da ${esc(v.da)}` : ""})`).join(" · ")}</p></div>`).join("") : `<p class="nota">Nessuna indicazione.</p>`;
  const offre = conf.filter((p) => p.passaggio?.tipo === "offro"), cerca = conf.filter((p) => p.passaggio?.tipo === "cerco");
  return `${indietro(`#uscita/${u.id}`, u.titolo)}
    <h1>Arrivi e partenze</h1>
    <section class="box"><div class="riga"><span class="eti">Chi li organizza</span><span class="chip ${u.arriviGestiti ? "c-bozza" : "c-ok"}">${u.arriviGestiti ? "L'organizzazione" : "I partecipanti"}</span></div>
      <p class="nota">${u.arriviGestiti ? "I partecipanti non vedono il modulo arrivi né i passaggi: seguono le tue indicazioni." : "Ogni confermato indica mezzo, orario e luogo dal suo link personale."}</p>
      <button class="btn secondario" data-azione="pt-gestiti" data-id="${u.id}">${u.arriviGestiti ? "Riattiva il modulo per i partecipanti" : "Li gestisco io: nascondi il modulo"}</button></section>
    <section class="box"><div class="riga"><span class="eti">Arrivi al ritrovo · ${esc(u.oraPartenza)}</span><b>${voci.length}/${conf.length}</b></div>${gruppi(ptRaggruppa(voci))}</section>
    <section class="box"><span class="eti">Ripartenze</span>${gruppi(ptRaggruppa(ritorni))}</section>
    ${senza.length ? `<section class="box"><span class="eti">Senza indicazioni</span><p class="nota">${senza.map((p) => esc(p.nome)).join(", ")}</p></section>` : ""}
    <section class="box"><div class="riga"><span class="eti">Passaggi</span><span class="nota">${offre.reduce((s, p) => s + (p.passaggio.posti || 0), 0)} posti offerti · ${cerca.length} cercano</span></div>
      ${offre.length || cerca.length ? `<p class="nota">${offre.map((p) => `${esc(p.nome)} offre ${p.passaggio.posti}`).concat(cerca.map((p) => `${esc(p.nome)} cerca`)).join(" · ")}</p>` : `<p class="nota">Nessuno ha pubblicato un passaggio.</p>`}
      <p class="nota">I contatti li vedono solo i partecipanti che li hanno pubblicati con consenso. I passaggi sono accordi privati: non ne rispondi tu.</p></section>
    <p class="nota">Fasce di mezz'ora calcolate dagli orari indicati. I dati si cancellano con quelli dell'uscita (${CONSERVAZIONE_GIORNI} giorni dopo).</p>`;
};

V.domande = (id) => {
  const u = uscita(id);
  if (!u) return nonTrovata();
  const d = u.domandeAperte || [];
  return `${indietro(`#uscita/${u.id}`, u.titolo)}
    <h1>Domande dei partecipanti</h1>
    <section class="box"><div class="riga"><span class="eti">Inoltrate dal Concierge</span><span class="chip c-ai">✦ Automatico</span></div>
      ${d.length ? d.slice().reverse().map((x) => `<div class="spunto"><p>“${esc(x.testo)}”</p>
        <div class="riga"><span class="nota">${esc(new Date(x.quando).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }))} · ${esc(x.origine)}</span>${x.gestita ? `<span class="chip c-ok">Gestita</span>` : `<button class="btn secondario piccolo" data-azione="pt-gestita" data-id="${u.id}" data-d="${x.id}">Segna come gestita</button>`}</div></div>`).join("")
      : `<p class="nota">Nessuna domanda inoltrata.</p>`}
      <p class="nota">Il Concierge risponde solo con i dati della scheda; quello che non sa lo gira a te, senza il nome di chi chiede. Rispondi nel gruppo o aggiorna la scheda.</p></section>
    <form class="box modulo" data-form="pt-sicurezza" data-id="${u.id}">
      <span class="eti">Testo sulla sicurezza</span>
      ${u.sicurezza ? `<p class="nota">Scritto il ${esc(new Date(u.sicurezza.data).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }))}. Il Concierge lo riporta parola per parola, con la data.</p>` : `<p class="nota">Senza questo testo, alle domande sulla sicurezza il Concierge risponde "Non lo so" e le gira a te.</p>`}
      <label for="pt-sic">Le tue indicazioni</label>
      <textarea id="pt-sic" name="testo" rows="4" maxlength="600" placeholder="Es. Tratto esposto di 50 m dopo la sella: si passa uno alla volta.">${esc(u.sicurezza?.testo || "")}</textarea>
      <button class="btn secondario" type="submit">Salva</button>
    </form>`;
};

// ---------- F32: pagina pubblica dell'offerta ----------
V.posto = (codice) => {
  ptPulizia();
  const t = ptDaOfferta(codice);
  const guscio = (corpo) => `<div class="pubblica">${corpo}<div class="powered centrato"><img src="icone/icon-192.png" alt="">Powered by Campo Base</div></div>`;
  if (!t) return guscio(`<h1>Link non valido</h1><p>Il link non esiste o è stato sostituito. Chiedi a chi organizza l'uscita.</p>`);
  const { u, p } = t, o = p.offerta;
  const torna = `<a class="indietro" href="#partecipanti/${u.id}">‹ Torna all'app del leader (solo nella demo)</a>`;
  if (o.stato === "accettata") return guscio(`${torna}<h1>Posto già accettato</h1><p>Trovi tutto nel tuo link personale.</p>${p.link ? `<a class="btn primario" href="#p/${esc(p.link.codice)}">Apri la tua pagina</a>` : ""}`);
  if (o.stato === "rifiutata") return guscio(`${torna}<h1>Hai rinunciato al posto</h1><p>Grazie di averlo detto: è passato al successivo in lista.</p>`);
  if (o.stato === "scaduta" || Date.now() > o.scade) return guscio(`${torna}<h1>Offerta scaduta</h1><p>Il link valeva ${PT_ORE_OFFERTA} ore. Se vuoi ancora venire, scrivi a ${esc(ptLeader())}.</p>`);
  if (p.stato !== "lista") return guscio(`${torna}<h1>Posto già assegnato</h1><p>Risulti già tra gli iscritti.</p>`);
  return guscio(`${torna}
    <p class="eti">Ciao ${esc(ptNome(p))}</p>
    <h1>Si è liberato un posto</h1>
    <section class="box"><div class="titolo-uscita">${esc(u.titolo)}</div>
      <p><b>${esc(dataLunga(u.data))}</b> · ritrovo ${esc(u.oraPartenza)} a ${esc(u.ritrovo.nome)}</p>
      <div class="dati"><div class="dato"><b>${C.numero(u.km)} km</b><span>distanza</span></div><div class="dato"><b>+${C.numero(u.dislivello)} m</b><span>dislivello</span></div><div class="dato"><b>${C.euro(u.prezzo)}</b><span>a persona</span></div></div>
      <p class="nota"><b>Annullamento:</b> ${esc(u.condizioni)}</p></section>
    <p class="testo-attenzione">L'offerta vale fino a ${esc(ptQuando(o.scade))}. Dopo, il posto passa al successivo in lista.</p>
    <button class="btn primario" data-azione="pt-accetta" data-codice="${esc(codice)}">Accetto il posto</button>
    <button class="btn secondario" data-azione="pt-rinuncia" data-codice="${esc(codice)}">Rinuncio</button>
    <p class="nota">Non è un pagamento: ${esc(ptLeader())} ti scrive per i dettagli.</p>`);
};
PUBBLICHE.push("posto");

// ---------- eventi ----------
function ptDopoConcierge() {
  const c = document.getElementById("pt-concierge");
  if (c) { c.scrollIntoView({ block: "end" }); document.getElementById("pt-dom")?.focus(); }
}

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-azione]");
  if (!el || !el.dataset.azione.startsWith("pt-")) return;
  const a = el.dataset.azione;
  const u = el.dataset.id ? uscita(el.dataset.id) : null;
  const p = u && el.dataset.p ? u.partecipanti.find((x) => x.id === Number(el.dataset.p)) : null;

  // Azioni del partecipante: identificato solo dal codice del link.
  if (["pt-confermo", "pt-disdico", "pt-passaggio-ritira", "pt-esigenza-revoca"].includes(a)) {
    const t = ptDaCodice(el.dataset.codice);
    if (!t) { mostra(); avviso("Il link non è più valido: chiedi un nuovo link a chi organizza."); return; }
    const { u: uu, p: pp } = t, fin = ptFinestra(ptOreMancanti(uu));
    if (a === "pt-confermo") {
      if (!fin) { avviso("L'uscita è già partita."); return; }
      pp.conferme ??= {}; pp.conferme[fin] = { valore: "confermo", quando: new Date().toISOString() };
      salva(); mostra(); avviso(`Grazie: ${ptLeader()} vede che ci sarai`); return;
    }
    if (a === "pt-disdico") {
      if (el.dataset.conferma !== "si") { el.dataset.conferma = "si"; el.textContent = "Tocca di nuovo per liberare il posto"; return; }
      uu.ptDisdette ??= []; uu.ptDisdette.push({ nome: pp.nome, quando: new Date().toISOString(), finestra: fin });
      uu.partecipanti = uu.partecipanti.filter((q) => q !== pp); delete uu.presenze[pp.id];
      const offerti = ptOffriAutomatico(uu);
      salva(); location.hash = `#pubblica/${uu.id}`;
      avviso(offerti.length ? `Disdetta registrata: il posto è stato offerto a ${ptNome(offerti[0])} della lista d'attesa` : "Disdetta registrata: il posto torna libero");
      return;
    }
    if (a === "pt-passaggio-ritira") {
      delete pp.passaggio;
      (pp.consensi ??= []).push({ tipo: "passaggi", valore: false, quando: new Date().toISOString(), versione: VERSIONE_INFORMATIVA });
      salva(); mostra(); avviso("Passaggio ritirato: il tuo contatto non è più visibile"); return;
    }
    if (a === "pt-esigenza-revoca") {
      if (el.dataset.conferma !== "si") { el.dataset.conferma = "si"; el.textContent = "Tocca di nuovo per cancellare"; return; }
      delete pp.esigenza;
      (pp.consensi ??= []).push({ tipo: "esigenze", valore: false, quando: new Date().toISOString(), versione: VERSIONE_INFORMATIVA });
      salva(); mostra(); avviso("Consenso revocato: le esigenze sono state cancellate"); return;
    }
  }

  if (a === "pt-accetta" || a === "pt-rinuncia") {
    const t = ptDaOfferta(el.dataset.codice);
    if (!t || t.p.offerta.stato !== "attiva" || Date.now() > t.p.offerta.scade || t.p.stato !== "lista") { mostra(); return; }
    const { u: uu, p: pp } = t;
    if (a === "pt-accetta") {
      if (conti(uu).confermati >= uu.posti) { avviso("Nel frattempo il posto non è più libero: scrivi a chi organizza."); return; }
      pp.stato = "confermato"; pp.offerta.stato = "accettata";
      const codice = ptLinkPersonale(uu, pp);
      salva(); location.hash = `#p/${codice}`; avviso("Posto accettato: questa è la tua pagina personale"); return;
    }
    if (el.dataset.conferma !== "si") { el.dataset.conferma = "si"; el.textContent = "Tocca di nuovo per rinunciare"; return; }
    pp.offerta.stato = "rifiutata";
    uu.partecipanti = uu.partecipanti.filter((q) => q !== pp);
    // La persona esce dalla lista; resta solo lo stato dell'offerta per la pagina del link.
    uu.ptRinunce ??= []; uu.ptRinunce.push({ codice: pp.offerta.codice, quando: Date.now() });
    ptOffriAutomatico(uu);
    salva(); mostra(); return;
  }

  // Azioni del leader.
  if (!u) return;
  switch (a) {
    case "pt-copia-conferma": {
      if (!p) return;
      const codice = ptLinkPersonale(u, p), fin = ptFinestra(ptOreMancanti(u)) || "48";
      salva();
      copia(`Ciao ${ptNome(p)}, mancano meno di ${fin} ore a ${u.titolo} (${dataBreve(u.data)}, ritrovo ${u.oraPartenza} a ${u.ritrovo.nome}). Conferma o disdici con un tocco dal tuo link personale: ${ptUrl("p/" + codice)}`, `Richiesta per ${p.nome} copiata`);
      return;
    }
    case "pt-offri":
      if (!p || p.stato !== "lista") return;
      if (ptLiberiPerLista(u) <= 0) { avviso("Nessun posto libero da offrire."); return; }
      ptOffri(u, p); salva(); mostra(); copia(ptTestoOfferta(u, p), `Offerta per ${p.nome} creata e copiata`); return;
    case "pt-copia-offerta":
      if (p?.offerta) copia(ptTestoOfferta(u, p), `Link per ${p.nome} copiato`); return;
    case "pt-gestiti": u.arriviGestiti = !u.arriviGestiti; salva(); mostra(); return;
    case "pt-gestita": { const d = (u.domandeAperte || []).find((x) => x.id === Number(el.dataset.d)); if (d) { d.gestita = true; salva(); mostra(); } return; }
  }
});

document.addEventListener("submit", (e) => {
  const f = e.target, tipo = f.dataset.form;
  if (!tipo || !tipo.startsWith("pt-")) return;
  e.preventDefault();
  const dati = new FormData(f);
  const testo = (k, max) => String(dati.get(k) || "").trim().slice(0, max);

  if (tipo === "pt-domanda") {
    const u = uscita(f.dataset.id), q = testo("domanda", 200);
    if (!u || !q) return;
    if (f.dataset.codice && !ptDaCodice(f.dataset.codice)) { mostra(); return; }
    const r = ptRispondi(q, ptDatiScheda(u));
    if (r.inoltra) {
      u.domandeAperte ??= [];
      // Log senza dati identificativi: solo testo, ora e pagina di provenienza.
      if (!u.domandeAperte.some((d) => !d.gestita && d.testo.toLowerCase() === q.toLowerCase())) {
        u.domandeAperte.push({ id: Date.now(), testo: q, quando: new Date().toISOString(), origine: f.dataset.codice ? "pagina personale" : "pagina pubblica", gestita: false });
      }
      salva();
    }
    const k = f.dataset.chiave;
    ptChat[k] = (ptChat[k] || []).concat({ da: "io", testo: q }, { da: "bot", testo: r.testo, fonte: r.fonte }).slice(-12);
    mostra(); ptDopoConcierge(); return;
  }

  if (tipo === "pt-sicurezza") {
    const u = uscita(f.dataset.id); if (!u) return;
    const t = testo("testo", 600);
    if (t) u.sicurezza = { testo: t, data: new Date().toISOString() }; else delete u.sicurezza;
    salva(); mostra(); avviso(t ? "Testo sulla sicurezza salvato" : "Testo sulla sicurezza tolto"); return;
  }

  const t = ptDaCodice(f.dataset.codice);
  if (!t) { mostra(); avviso("Il link non è più valido: chiedi un nuovo link a chi organizza."); return; }
  const { u, p } = t;

  if (tipo === "pt-viaggio") {
    const mezzo = PT_MEZZI.includes(dati.get("mezzo")) ? dati.get("mezzo") : "altro";
    const arrivo = testo("arrivo", 5), ripartenza = testo("ripartenza", 5);
    if (!ptFascia(arrivo)) { avviso("Indica l'orario di arrivo al ritrovo."); return; }
    p.viaggio = { mezzo, arrivo, ripartenza: ptFascia(ripartenza) ? ripartenza : "", da: testo("da", 40), quando: new Date().toISOString() };
    p.arrivo = `${mezzo}, ${arrivo}`;
    salva(); mostra(); avviso(`Salvato: ${ptLeader()} vede come arrivi`); return;
  }

  if (tipo === "pt-passaggio") {
    const tp = dati.get("tipo"), contatto = testo("contatto", 40);
    if (!["offro", "cerco"].includes(tp)) { avviso("Scegli se offri o cerchi un passaggio."); return; }
    if (!contatto) { avviso("Scrivi il contatto da mostrare agli altri iscritti."); return; }
    if (!dati.get("consenso")) { avviso("Per pubblicare il contatto serve il tuo consenso: spunta la casella."); return; }
    const quando = new Date().toISOString();
    p.passaggio = { tipo: tp, posti: tp === "offro" ? Math.min(8, Math.max(1, Number(dati.get("posti")) || 1)) : 0, da: testo("da", 40), contatto, consenso: quando, versione: VERSIONE_INFORMATIVA };
    (p.consensi ??= []).push({ tipo: "passaggi", valore: true, quando, versione: VERSIONE_INFORMATIVA });
    salva(); mostra(); avviso("Passaggio pubblicato per gli altri iscritti"); return;
  }

  if (tipo === "pt-esigenza") {
    const etichette = dati.getAll("etichetta").filter((x) => PT_ESIGENZE.includes(x));
    const err = document.getElementById("pt-errore-esigenza");
    const errore = (m) => { if (err) { err.hidden = false; err.textContent = m; } else avviso(m); };
    if (!etichette.length) { errore("Scegli almeno un'etichetta."); return; }
    if (!dati.get("consenso")) { errore("Per inviare serve il consenso: spunta la casella sopra il pulsante."); return; }
    const quando = new Date().toISOString();
    p.esigenza = { etichetta: etichette.join(", "), etichette, nota: testo("nota", 60), consenso: quando, versione: VERSIONE_INFORMATIVA };
    (p.consensi ??= []).push({ tipo: "esigenze", valore: true, quando, versione: VERSIONE_INFORMATIVA });
    salva(); mostra(); avviso(`Inviato: solo ${ptLeader()} lo vede`);
  }
});

// Pulizia anche all'avvio (dopo carica() di app.js, registrato prima di questo file).
window.addEventListener("DOMContentLoaded", () => { if (S) { ptPulizia(); } });
