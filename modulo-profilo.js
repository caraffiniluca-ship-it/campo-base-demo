"use strict";
// Modulo profilo, strutture e dopo l'uscita (lato leader).
// Funzioni coperte: F17 Post-uscita in tre passi · F21 Community QR (canale WhatsApp) · F22 Titoli e zone dichiarati
// F23 Scadenzario professionale · F25 Abbonamento (simulato) · F48 Rubrica fornitori personale
// F84 Scheda struttura · F73 Assistente camere (a regole, nessuna AI esterna).
// Nessuna rete, nessuna libreria, nessun pagamento reale: tutti i dati sono di esempio.

PUBBLICHE.push("feedback", "entra");

const PR_TIPI = { rifugio: "Rifugio", hotel: "Hotel", ristorante: "Ristorante", autista: "Autista o navetta", guida: "Guida locale", altro: "Altro" };
const PR_STRUTTURE = ["rifugio", "hotel", "ristorante"];
const PR_SERVIZI = {
  rifugio: ["Sacco lenzuolo obbligatorio", "Coperte o piumoni forniti", "Docce calde", "Ricarica telefoni", "Pagamento con carta", "Acqua potabile al rubinetto", "Camere private", "Camerate", "Mezza pensione", "Pranzo al sacco su richiesta", "Ciabatte fornite"],
  hotel: ["Colazione inclusa", "Camere multiple", "Parcheggio", "Pagamento con carta", "Deposito scarponi", "Asciugatura indumenti", "Check-in dopo le 20", "Pranzo al sacco su richiesta"],
  ristorante: ["Menu di gruppo", "Menu vegetariano", "Pagamento con carta", "Prenotazione obbligatoria", "Sala riservata", "Parcheggio"],
};
// F25: prezzi proposti, da confermare (consulenza fiscale R18, fornitore T10).
const PR_OFFERTE = {
  "base-mese": { nome: "Base", prezzo: "12 € al mese", mesi: 1 },
  "base-anno": { nome: "Base", prezzo: "120 € all'anno", mesi: 12 },
  "pro-mese": { nome: "Pro", prezzo: "20 € al mese", mesi: 1 },
  "pro-anno": { nome: "Pro", prezzo: "200 € all'anno", mesi: 12 },
  fondatore: { nome: "Fondatore", prezzo: "60 € il primo anno", mesi: 12 },
};
const PR_PREF = { indifferente: "Indifferente", insieme: "Insieme a…", silenziosa: "Camera tranquilla", singola: "Singola se c'è" };

// ---------- funzioni pure (provate con node) ----------
// F73: proposta di camere a regole fisse. persone: [{ id, tipo, con }], capienze: [posti per camera].
function prProponiCamere(persone, capienze) {
  const camere = capienze.map((c) => ({ capienza: c, persone: [] }));
  const note = [], nonSistemati = [];
  const ids = new Set(persone.map((p) => p.id));
  const tipo = new Map(persone.map((p) => [p.id, p.tipo]));
  // Chi vuole stare insieme forma un gruppo (anche a catena: A con B, B con C).
  const padre = new Map(persone.map((p) => [p.id, p.id]));
  const radice = (x) => { while (padre.get(x) !== x) x = padre.get(x); return x; };
  for (const p of persone) if (p.tipo === "insieme" && ids.has(p.con) && p.con !== p.id) { const a = radice(p.id), b = radice(p.con); if (a !== b) padre.set(a, b); }
  const mappa = new Map();
  for (const p of persone) { const r = radice(p.id); if (!mappa.has(r)) mappa.set(r, []); mappa.get(r).push(p.id); }
  let gruppi = [...mappa.values()];
  const libere = (c) => c.capienza - c.persone.length;
  const tranquilla = (lista) => lista.some((id) => tipo.get(id) === "silenziosa");
  // 1. Le singole richieste vanno nelle camere da un posto, finché ce ne sono.
  for (const g of gruppi.filter((x) => x.length === 1 && tipo.get(x[0]) === "singola")) {
    const c = camere.find((x) => x.capienza === 1 && !x.persone.length);
    if (c) { c.persone.push(g[0]); gruppi = gruppi.filter((x) => x !== g); }
    else note.push("Non ci sono abbastanza camere singole: una richiesta di singola va in camera condivisa.");
  }
  // 2. Prima i gruppi più grandi; ogni gruppo va nella camera che lo contiene con meno posti avanzati.
  //    Le camere da un posto restano per ultime; chi chiede tranquillità sta con chi la chiede.
  gruppi.sort((a, b) => b.length - a.length || tranquilla(b) - tranquilla(a));
  const punteggio = (c, g) => (c.persone.length && tranquilla(c.persone) !== tranquilla(g) ? 10 : 0) + (c.capienza === 1 ? 5 : 0) + (libere(c) - g.length);
  const sistema = (g) => {
    const adatte = camere.filter((c) => libere(c) >= g.length);
    if (!adatte.length) return false;
    adatte.sort((a, b) => punteggio(a, g) - punteggio(b, g));
    adatte[0].persone.push(...g);
    return true;
  };
  for (const g of gruppi) {
    if (sistema(g)) continue;
    if (g.length > 1) note.push(`Un gruppo di ${g.length} persone non entra in una sola camera: è stato diviso.`);
    for (const id of g) if (!sistema([id])) nonSistemati.push(id);
  }
  if (nonSistemati.length) note.push(`Mancano ${nonSistemati.length} posti letto: aggiungi camere o chiedi alla struttura.`);
  return { camere, nonSistemati, note: [...new Set(note)] };
}

// F17: il riepilogo del feedback esiste solo con almeno 5 risposte.
function prAggrega(risposte) {
  if (!Array.isArray(risposte) || risposte.length < 5) return null;
  const dist = [0, 0, 0, 0, 0];
  for (const r of risposte) dist[r.voto - 1]++;
  const media = risposte.reduce((a, r) => a + r.voto, 0) / risposte.length;
  // Commenti senza nome e in ordine alfabetico, non di arrivo: l'ordine non deve far riconoscere chi ha scritto.
  const commenti = risposte.map((r) => (r.commento || "").trim()).filter(Boolean).sort((a, b) => a.localeCompare(b, "it"));
  return { n: risposte.length, media: Math.round(media * 10) / 10, dist, commenti };
}

function prCapienze(testo) {
  return String(testo || "").split(/[,;\s]+/).map((x) => Number(x)).filter((n) => Number.isInteger(n) && n >= 1 && n <= 20).slice(0, 30);
}

// ---------- dati di esempio, aggiunti una volta sola ----------
const prIso = (giorni) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + giorni); return isoLocale(d); };
const prLink = (hash) => `${location.origin}${location.pathname}#${hash}`;
const prContatto = (id) => (S.leader.rubrica || []).find((c) => c.id === Number(id));
const prData = (iso) => new Date(iso.length === 10 ? iso + "T12:00" : iso).toLocaleDateString("it-IT");
const prDataOra = (iso) => new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
const prPrimo = (nome) => String(nome || "").split(" ")[0];
const prFinita = (u) => u.stato === "conclusa" || (u.stato !== "bozza" && u.stato !== "annullata" && giorniA(u.data) < 0);

function prInit() {
  const L = S.leader;
  L.ente ??= "";
  L.scadenze ??= [];
  L.rubrica ??= [];
  L.abbonamento ??= { stato: "nessuno" };
  L.community ??= { canale: "https://whatsapp.com/channel/ESEMPIO-campo-base", codice: codiceCasuale(), consensi: [] };
  if (L.prEsempi) return;
  L.prEsempi = true;
  if (!L.ente) L.ente = "Associazione di categoria (esempio)";
  const rifugio = { id: nuovoId(), tipo: "rifugio", nome: "Rifugio del Monte (esempio)", telefono: "000 000 0000 (esempio)", email: "rifugio@esempio.it", nota: "Gestore: Paola. Meglio chiamare dopo le 18.",
    struttura: { servizi: ["Sacco lenzuolo obbligatorio", "Docce calde", "Ricarica telefoni", "Camerate", "Mezza pensione"], orarioCena: "19:30", note: "Camere: 2 da 4 posti, 2 da 2, 1 singola.", dichiaratoDa: "gestore, al telefono", aggiornata: prIso(-20), allergeni: null } };
  L.rubrica.push(rifugio,
    { id: nuovoId(), tipo: "ristorante", nome: "Trattoria della Valle (esempio)", telefono: "000 111 1111 (esempio)", email: "", nota: "Menu di gruppo su prenotazione.", struttura: null },
    { id: nuovoId(), tipo: "autista", nome: "Navetta Rossi (esempio)", telefono: "000 222 2222 (esempio)", email: "", nota: "Pulmino da 16 posti.", struttura: null });
  // F17: feedback di esempio per l'uscita conclusa (5 risposte: il riepilogo si vede).
  const conclusa = S.uscite.find((u) => u.stato === "conclusa" && u.partecipanti.filter((p) => p.stato === "confermato").length >= 5);
  if (conclusa && !conclusa.feedback) {
    const voti = [[5, "Percorso bellissimo, ritmo giusto."], [4, ""], [5, "Organizzazione precisa, tornerò."], [4, "Avrei fatto una pausa in più in salita."], [5, ""]];
    conclusa.feedback = conclusa.partecipanti.filter((p) => p.stato === "confermato").slice(0, 5)
      .map((p, i) => ({ pId: p.id, voto: voti[i][0], commento: voti[i][1], quando: new Date(Date.now() - (i + 1) * 3600000).toISOString(), esempio: true }));
  }
  // F73: preferenze e consensi di esempio per la prossima uscita pubblicata.
  const prossima = S.uscite.filter((u) => u.stato === "pubblicata").sort((a, b) => a.data.localeCompare(b.data))[0];
  if (prossima) {
    const pn = (nome) => prossima.partecipanti.find((p) => p.nome === nome);
    const pref = [["Giulia R.", "insieme", "Chiara F."], ["Paolo S.", "insieme", "Davide C."], ["Luca B.", "silenziosa"], ["Elena M.", "singola"]];
    for (const [nome, tipo, con] of pref) { const p = pn(nome); if (p) p.prefCamera = { tipo, con: con && pn(con) ? pn(con).id : null, esempio: true }; }
    for (const nome of ["Giulia R.", "Chiara F.", "Paolo S.", "Davide C.", "Luca B."]) {
      const p = pn(nome); if (p) p.consensoStruttura = { valore: true, quando: new Date().toISOString(), versione: VERSIONE_INFORMATIVA, esempio: true };
    }
    prossima.fornitori = [rifugio.id];
    prossima.camere = { struttura: rifugio.id, capienze: [4, 4, 2, 2, 1] };
  }
  salva();
}

// ---------- F22, F23, F25: profilo ----------
function prChipScadenza(iso) {
  const g = giorniA(iso);
  if (g < 0) return `<span class="chip c-errore">scaduta da ${-g} giorni</span>`;
  if (g === 0) return `<span class="chip c-errore">scade oggi</span>`;
  if (g <= 30) return `<span class="chip c-attenzione">tra ${g} giorni: rinnova</span>`;
  return `<span class="chip c-ok">tra ${g} giorni</span>`;
}

function prSezioneTitoli() {
  const L = S.leader;
  return `<section class="box">
      <span class="eti">Titoli e zone</span>
      <p><b>${esc(L.titolo)}</b> <span class="chip c-info">dichiarato dal leader</span></p>
      <form class="modulo" data-form="pr-titoli">
        <label for="pr-titolo">Titoli professionali</label>
        <input id="pr-titolo" name="titolo" maxlength="120" value="${esc(L.titolo)}" placeholder="Es. Guida ambientale escursionistica">
        <label for="pr-ente">Ente o associazione</label>
        <input id="pr-ente" name="ente" maxlength="80" value="${esc(L.ente)}" placeholder="Es. associazione di categoria o collegio regionale">
        <label for="pr-zone">Zone in cui lavori</label>
        <input id="pr-zone" name="zone" maxlength="120" value="${esc(L.zone)}">
        <button class="btn secondario" type="submit">Salva titoli e zone</button>
      </form>
      <p class="nota">Ente: ${esc(L.ente || "non indicato")}. Zone: ${esc(L.zone)}. Tutto è dichiarato dal leader: Gruvia ricorda i titoli, non li verifica e non li certifica.</p>
    </section>`;
}

function prSezioneScadenze() {
  const L = S.leader;
  const scad = L.scadenze.map((s, i) => ({ s, i })).sort((a, b) => a.s.data.localeCompare(b.s.data));
  return `<section class="box">
      <span class="eti">Scadenzario</span>
      ${scad.length ? scad.map(({ s, i }) => `<div class="riga"><span><b>${esc(s.voce)}</b> ${prChipScadenza(s.data)}</span>
        <span class="pr-scadenza"><label class="visuale-nascosta" for="pr-sd-${i}">Data di ${esc(s.voce)}</label>
          <input id="pr-sd-${i}" class="selettore" type="date" value="${esc(s.data)}" data-azione="pr-scad-data" data-i="${i}">
          <button class="btn icona" data-azione="pr-scad-elimina" data-i="${i}" aria-label="Elimina ${esc(s.voce)}" title="Elimina">✕</button></span></div>`).join("") : `<p class="nota">Nessuna scadenza. Aggiungi RC professionale, BLSD, aggiornamenti.</p>`}
      <form class="modulo" data-form="pr-scad-nuova">
        <div class="due"><div><label for="pr-voce">Nuova scadenza</label><input id="pr-voce" name="voce" required maxlength="60" placeholder="Es. Aggiornamento professionale"></div>
          <div><label for="pr-data">Data</label><input id="pr-data" name="data" type="date" required></div></div>
        <button class="btn secondario" type="submit">Aggiungi la scadenza</button>
      </form>
      <p class="nota">Le scadenze entro 30 giorni compaiono anche nella schermata Oggi.</p>
    </section>`;
}

function prSezioneStrumenti() {
  const L = S.leader;
  return `<section class="box">
      <span class="eti">Strumenti</span>
      <a class="btn secondario" href="#rubrica">Rubrica fornitori (${L.rubrica.length})</a>
      <a class="btn secondario" href="#community">Community WhatsApp e QR</a>
    </section>`;
}

function prDopoMesi(iso, mesi) { const d = new Date(iso); d.setMonth(d.getMonth() + mesi); return d.toISOString(); }

function prSezioneAbbonamento() {
  const A = S.leader.abbonamento, o = PR_OFFERTE[A.scelta];
  const stato = { nessuno: `<span class="chip c-bozza">Nessun abbonamento</span>`, checkout: `<span class="chip c-info">Pagamento in corso (simulato)</span>`,
    attivo: `<span class="chip c-ok">Attivo</span>`, disdetto: `<span class="chip c-attenzione">Disdetto</span>` }[A.stato] || "";
  const scelta = `<form class="modulo" data-form="pr-abb">
      ${Object.entries(PR_OFFERTE).map(([k, v], i) => `<label class="spunta"><input type="radio" name="offerta" value="${k}" ${i === 0 ? "required" : ""} ${A.scelta === k ? "checked" : ""}> ${esc(v.nome)} · ${esc(v.prezzo)}</label>`).join("")}
      <button class="btn primario" type="submit">Continua sul sito del fornitore di pagamenti</button>
    </form>`;
  let corpo;
  if (A.stato === "checkout") {
    corpo = `<div class="fumetto">Simulazione: nell'app vera qui si apre la pagina sicura del fornitore di pagamenti esterno, scelto in T10.
Lì inserisci la carta. Gruvia riceve solo l'esito e lo stato dell'abbonamento: nessun dato di carta passa dall'app.</div>
      <p>Piano scelto: <b>${esc(o.nome)} · ${esc(o.prezzo)}</b></p>
      <button class="btn primario" data-azione="pr-abb-paga">Simula il pagamento riuscito</button>
      <button class="btn secondario" data-azione="pr-abb-annulla">Torna indietro senza pagare</button>`;
  } else if (A.stato === "attivo") {
    corpo = `<p>Piano <b>${esc(o.nome)} · ${esc(o.prezzo)}</b> dal ${esc(prData(A.dal))}. Rinnovo il ${esc(prData(A.rinnovo))}.</p>
      ${A.scelta === "fondatore" ? `<p class="nota">Prezzo dopo il primo anno: da definire.</p>` : ""}
      <button class="btn secondario testo-errore" data-azione="pr-abb-disdici">Disdici l'abbonamento</button>
      <p class="nota">Nell'app vera la disdetta passa dal portale del fornitore di pagamenti.</p>`;
  } else if (A.stato === "disdetto") {
    corpo = `<p>Disdetto il ${esc(prData(A.disdetto))}: resta attivo fino al ${esc(prData(A.rinnovo))}, poi non si rinnova.</p>
      <p class="eti">Vuoi riattivarlo?</p>${scelta}`;
  } else corpo = scelta;
  return `<section class="box">
      <div class="riga"><span class="eti">Abbonamento</span>${stato}</div>
      ${corpo}
      <p class="nota">Piani e prezzi proposti, da confermare. Demo: nessun pagamento reale e nessun dato di carta, il passaggio al fornitore è simulato.</p>
    </section>`;
}

const prVistaProfilo = V.profilo;
V.profilo = (id) => {
  prInit();
  let html = prVistaProfilo(id);
  // Le due sezioni statiche (titoli, scadenzario) diventano modificabili, una alla volta e al loro posto;
  // tutte le altre sezioni, anche quelle aggiunte da altri moduli, restano come sono.
  const sostituisci = (marcatore, nuova) => {
    const k = html.indexOf(marcatore), a = k < 0 ? -1 : html.lastIndexOf('<section class="box">', k), b = a < 0 ? -1 : html.indexOf("</section>", k);
    if (b < 0) return false;
    html = html.slice(0, a) + nuova + html.slice(b + 10);
    return true;
  };
  const extra = prSezioneAbbonamento() + prSezioneStrumenti();
  const okT = sostituisci('<span class="eti">Titoli e zone</span>', prSezioneTitoli());
  const okS = sostituisci('<span class="eti">Scadenzario</span>', prSezioneScadenze() + extra);
  return html + (okT ? "" : prSezioneTitoli()) + (okS ? "" : prSezioneScadenze() + extra);
};

// F23: promemoria nella schermata Oggi per le scadenze entro 30 giorni.
const prVistaOggi = V.oggi;
V.oggi = (id) => {
  prInit();
  const html = prVistaOggi(id);
  const vicine = S.leader.scadenze.filter((s) => giorniA(s.data) <= 30).sort((a, b) => a.data.localeCompare(b.data));
  if (!vicine.length) return html;
  const box = `<a class="box" href="#profilo"><div class="riga"><span class="eti">Scadenze</span><span class="chip c-attenzione">${vicine.length} entro 30 giorni</span></div>
    ${vicine.map((s) => `<div class="riga"><span>${esc(s.voce)}</span>${prChipScadenza(s.data)}</div>`).join("")}</a>`;
  const k = html.indexOf("</h1>");
  return k < 0 ? html + box : html.slice(0, k + 5) + box + html.slice(k + 5);
};

// ---------- collegamenti dalla scheda dell'uscita ----------
const PR_NAV = `<nav class="sottomenu" aria-label="Sezioni dell'uscita">`;
const prVistaUscita = V.uscita;
V.uscita = (id) => {
  const html = prVistaUscita(id);
  const u = uscita(id);
  if (!u) return html;
  prInit();
  const link = (prFinita(u) ? `<a href="#dopo/${u.id}">Dopo l'uscita</a>` : "") + `<a href="#logistica/${u.id}">Logistica</a>`;
  return html.replace(PR_NAV, PR_NAV + link);
};

// ---------- F17: dopo l'uscita in tre passi ----------
function prPresenti(u) {
  const conf = u.partecipanti.filter((p) => p.stato === "confermato");
  const segnati = conf.filter((p) => u.presenze[p.id]);
  return segnati.length ? segnati : conf;
}
function prProssima(u) {
  return S.uscite.filter((x) => x !== u && x.stato === "pubblicata" && giorniA(x.data) >= 0).sort((a, b) => a.data.localeCompare(b.data))[0] || null;
}
function prTesti(u) {
  const n = prPresenti(u).length || u.presentiArchivio || 0;
  const pross = prProssima(u), comm = S.leader.community;
  return {
    riepilogo: `Grazie per ${u.titolo} di ${dataLunga(u.data)}!\nAbbiamo fatto ${C.numero(u.km)} km e +${C.numero(u.dislivello)} m${n ? `, in ${n}` : ""}.\nTra poco vi scrivo un link personale per un voto veloce: mi aiuta a migliorare.\nA presto, ${prPrimo(S.leader.nome)}`,
    invito: pross
      ? `La prossima uscita: ${pross.titolo}, ${dataLunga(pross.data)}.\n${C.numero(pross.km)} km, +${C.numero(pross.dislivello)} m, difficoltà ${pross.dettagli.difficolta}. Quota ${pross.prezzo} €.\nPer chiedere un posto: ${prLink("pubblica/" + pross.id)}\nSe vuoi ricevere gli annunci, entra nel canale WhatsApp (facoltativo): ${prLink("entra/" + comm.codice)}\n${S.leader.marchio}`
      : "",
  };
}
function prTestoFeedback(u, p) {
  return `Ciao ${prPrimo(p.nome)}, grazie per ${u.titolo}! Com'è andata?\nUn voto da 1 a 5 e, se vuoi, un commento: ${prLink("feedback/" + p.linkFeedback.codice)}\nLo legge solo ${prPrimo(S.leader.nome)}, insieme alle altre risposte e senza il tuo nome.`;
}

V.dopo = (id) => {
  const u = uscita(id);
  if (!u) return nonTrovata();
  prInit();
  if (!prFinita(u)) return `${indietro(`#uscita/${u.id}`, u.titolo)}<h1>Dopo l'uscita</h1><p class="nota">Questa schermata si apre a uscita conclusa. Prima segna l'uscita come conclusa.</p>`;
  u.dopo ??= {};
  const T = prTesti(u), persone = prPresenti(u), agg = prAggrega(u.feedback || []);
  const fatto = (k) => u.dopo[k] ? `<span class="chip c-ok">Copiato ${esc(prData(u.dopo[k]))}</span>` : `<span class="chip c-bozza">Da fare</span>`;
  return `${indietro(`#uscita/${u.id}`, u.titolo)}
    <h1>Dopo l'uscita</h1>
    <p class="nota">Tre passi, meglio il giorno dopo. I testi si copiano e li incolli tu su WhatsApp: l'app non scrive a nessuno.</p>
    <section class="box">
      <div class="riga"><span class="pr-passo"><span class="pr-num">1</span><span class="eti">Riepilogo</span></span>${fatto("riepilogo")}</div>
      <div class="fumetto pr-lungo">${esc(T.riepilogo)}</div>
      <button class="btn primario" data-azione="pr-copia-riepilogo" data-id="${u.id}">Copia per il gruppo</button>
    </section>
    <section class="box">
      <div class="riga"><span class="pr-passo"><span class="pr-num">2</span><span class="eti">Una domanda di feedback</span></span>${fatto("feedback")}</div>
      <p class="nota">Ogni persona riceve il suo link personale (non indovinabile, vale 14 giorni): voto da 1 a 5 e commento facoltativo. Le risposte sono private: non vedi chi ha risposto né cosa.</p>
      ${persone.length ? `<div class="elenco-persone">${persone.map((p) => `<div class="persona"><div class="testo"><strong>${esc(p.nome)}</strong><span>${p.linkFeedback ? "Link creato" : "Link non ancora creato"}</span></div>
        <button class="btn secondario piccolo" data-azione="pr-link-feedback" data-id="${u.id}" data-p="${p.id}">Copia il messaggio</button></div>`).join("")}</div>`
      : `<p class="nota">I dati dei partecipanti non ci sono più: non si possono creare nuovi link.</p>`}
      <span class="eti">Risultato</span>
      ${agg ? `<div class="dati"><div class="dato"><b>${C.numero(agg.media)} / 5</b><span>voto medio</span></div><div class="dato"><b>${agg.n}</b><span>risposte</span></div></div>
        ${[5, 4, 3, 2, 1].map((v) => `<div class="pr-distribuzione"><span>${v}</span><div class="barra" role="img" aria-label="${agg.dist[v - 1]} voti da ${v}"><i style="width:${Math.round((agg.dist[v - 1] / agg.n) * 100)}%"></i></div><span>${agg.dist[v - 1]}</span></div>`).join("")}
        ${agg.commenti.length ? agg.commenti.map((c) => `<p class="fumetto">${esc(c)}</p>`).join("") : `<p class="nota">Nessun commento scritto.</p>`}
        <p class="nota">Commenti senza nome, in ordine alfabetico. Nessun suggerimento automatico sull'itinerario: le conclusioni le tiri tu.${(u.feedback || []).some((r) => r.esempio) ? " Contiene risposte di esempio della demo." : ""}</p>`
      : `<p>Risposte ricevute: <b>${(u.feedback || []).length}</b>.</p><p class="nota">Il riepilogo compare da 5 risposte, così nessuno è riconoscibile.</p>`}
    </section>
    <section class="box">
      <div class="riga"><span class="pr-passo"><span class="pr-num">3</span><span class="eti">Invito alla prossima uscita</span></span>${T.invito ? fatto("invito") : ""}</div>
      ${T.invito ? `<div class="fumetto pr-lungo">${esc(T.invito)}</div>
        <button class="btn primario" data-azione="pr-copia-invito" data-id="${u.id}">Copia l'invito</button>
        <p class="nota">Il canale WhatsApp è facoltativo: chi entra passa dalla pagina di consenso.</p>`
      : `<p class="nota">Non hai uscite pubblicate in programma. Pubblicane una e torna qui per l'invito.</p><a class="btn secondario" href="#uscite">Vai alle uscite</a>`}
    </section>`;
};

// Pagina pubblica del feedback: la persona si riconosce solo dal codice del suo link.
function prTrovaFeedback(codice) {
  if (typeof codice !== "string" || codice.length < 32) return null;
  for (const u of S.uscite) { const p = u.partecipanti.find((q) => q.linkFeedback && q.linkFeedback.codice === codice); if (p) return { u, p }; }
  return null;
}
V.feedback = (codice) => {
  prInit();
  const t = prTrovaFeedback(codice);
  if (!t) return `<div class="pubblica"><h1>Link non valido</h1><p>Il link non esiste o è stato sostituito. Chiedi un nuovo link a chi ha organizzato l'uscita.</p></div>`;
  const { u, p } = t;
  if (Date.now() > p.linkFeedback.scade) return `<div class="pubblica"><h1>Link scaduto</h1><p>Il link per il voto valeva 14 giorni. Grazie lo stesso!</p></div>`;
  const mia = (u.feedback || []).find((r) => r.pId === p.id);
  return `<div class="pubblica">
    <a class="indietro" href="#dopo/${u.id}">‹ Torna all'app del leader (solo nella demo)</a>
    <p class="eti">Ciao ${esc(prPrimo(p.nome))}</p>
    <h1>Com'è andata ${esc(u.titolo)}?</h1>
    <p class="nota">${esc(dataLunga(u.data))} con ${esc(S.leader.marchio)}</p>
    <form class="box modulo" data-form="pr-feedback" data-codice="${esc(codice)}">
      <fieldset class="pr-voti"><legend>Il tuo voto *</legend>
        ${[1, 2, 3, 4, 5].map((v) => `<label><input type="radio" name="voto" value="${v}" required ${mia && mia.voto === v ? "checked" : ""}><span>${v}</span></label>`).join("")}
      </fieldset>
      <p class="nota">1 = non mi è piaciuta, 5 = bellissima.</p>
      <label for="pr-commento">Un commento (facoltativo)</label>
      <textarea id="pr-commento" name="commento" maxlength="300" rows="3">${esc(mia ? mia.commento : "")}</textarea>
      <button class="btn primario" type="submit">${mia ? "Aggiorna la risposta" : "Invia"}</button>
      ${mia ? `<p class="testo-ok">Hai già risposto: puoi cambiare il voto finché il link vale.</p>` : ""}
      <p class="nota">Lo legge solo ${esc(prPrimo(S.leader.nome))}, e solo insieme ad almeno altre 4 risposte, senza il tuo nome.</p>
    </form>
    <div class="powered centrato"><img src="icone/icon-192.png" alt="">Powered by Gruvia</div>
  </div>`;
};

// ---------- F21: community WhatsApp con pagina di consenso ----------
V.community = () => {
  prInit();
  const c = S.leader.community, link = prLink("entra/" + c.codice);
  return `${indietro("#profilo", "Profilo")}
    <h1>Community WhatsApp</h1>
    <section class="box">
      <span class="eti">Link della pagina di consenso</span>
      <div class="fumetto pr-lungo">${esc(link)}</div>
      <button class="btn primario" data-azione="pr-copia-community">Copia il link</button>
      <p class="nota">QR da generare con uno strumento gratuito: incolla questo link e stampa il QR per il punto di ritrovo. Il QR porta alla pagina di consenso, non direttamente al canale.</p>
      <a class="btn secondario" href="#entra/${esc(c.codice)}">Vedi la pagina come un partecipante</a>
    </section>
    <section class="box">
      <span class="eti">Il tuo canale WhatsApp</span>
      <form class="modulo" data-form="pr-canale">
        <label for="pr-canale">Link del canale (esempio)</label>
        <input id="pr-canale" name="canale" type="url" required maxlength="200" value="${esc(c.canale)}">
        <button class="btn secondario" type="submit">Salva il link</button>
      </form>
      <p class="nota">Si accettano solo link che iniziano con https://whatsapp.com/channel/ o https://chat.whatsapp.com/. Le funzioni di canali e community le gestisce WhatsApp (da verificare, R14).</p>
    </section>
    <section class="box">
      <div class="riga"><span class="eti">Consensi registrati</span><b>${c.consensi.length}</b></div>
      ${c.consensi.length ? c.consensi.slice().reverse().slice(0, 20).map((k) => `<div class="riga nota"><span>${esc(prDataOra(k.quando))}</span><span>informativa ${esc(k.versione)}</span></div>`).join("") : `<p class="nota">Ancora nessuno.</p>`}
      <p class="nota">Ogni ingresso registra data, ora e versione dell'informativa, senza nome né numero.</p>
      <button class="btn secondario" data-azione="pr-nuovo-codice">Crea un nuovo link (il vecchio QR smette di funzionare)</button>
    </section>`;
};

let prEntrato = null; // codice per cui in questa pagina è appena stato dato il consenso
V.entra = (codice) => {
  prInit();
  const c = S.leader.community;
  if (!codice || codice !== c.codice) return `<div class="pubblica"><h1>Link non valido</h1><p>Questo QR non è più attivo. Chiedi il link aggiornato a chi organizza le uscite.</p></div>`;
  const ultimo = c.consensi[c.consensi.length - 1];
  return `<div class="pubblica">
    <a class="indietro" href="#community">‹ Torna all'app del leader (solo nella demo)</a>
    <div class="leader grande-leader"><div class="avatar">${esc(S.leader.marchio.split(" ").map((p) => p[0]).filter((x) => /[A-Z]/.test(x)).slice(0, 2).join(""))}</div>
      <div><strong>${esc(S.leader.marchio)}</strong><span class="nota">Canale WhatsApp delle uscite</span></div></div>
    <h1>Entra nel canale</h1>
    ${prEntrato === codice && ultimo ? `<section class="box">
        <p class="testo-ok">Consenso registrato il ${esc(prDataOra(ultimo.quando))}, informativa versione ${esc(ultimo.versione)}.</p>
        <a class="btn primario" href="${esc(c.canale)}" target="_blank" rel="noopener noreferrer">Apri il canale WhatsApp ↗</a>
        <p class="nota">Nella demo il link è di esempio. Puoi uscire dal canale quando vuoi da WhatsApp.</p>
      </section>`
    : `<form class="box modulo" data-form="pr-entra" data-codice="${esc(codice)}">
        <p>Nel canale ${esc(S.leader.nome)} pubblica gli annunci delle prossime uscite. È facoltativo e non serve per iscriversi alle uscite.</p>
        <label class="spunta"><input type="checkbox" name="consenso" required> Acconsento a ricevere gli annunci di ${esc(S.leader.marchio)} sul canale WhatsApp. Ho letto l'informativa (versione ${esc(VERSIONE_INFORMATIVA)}).</label>
        <p class="nota">Titolare del trattamento: ${esc(S.leader.nome)}. Si registrano solo data, ora e versione dell'informativa. Informativa completa: link del leader (esempio nella demo).</p>
        <button class="btn primario" type="submit">Acconsento e continuo</button>
      </form>`}
    <div class="powered centrato"><img src="icone/icon-192.png" alt="">Powered by Gruvia</div>
  </div>`;
};

// ---------- F48: rubrica fornitori; F84: scheda struttura ----------
V.rubrica = () => {
  prInit();
  const R = S.leader.rubrica;
  const usi = (c) => S.uscite.filter((u) => (u.fornitori || []).includes(c.id)).length;
  return `${indietro("#profilo", "Profilo")}
    <h1>Rubrica fornitori</h1>
    <p class="nota">Rifugi, strutture e fornitori che usi in più uscite. Sono dati di terzi: inserisci solo contatti di lavoro e cancellali quando te lo chiedono.</p>
    <section class="box elenco-persone">
      ${R.length ? R.map((c) => `<div class="persona">
        <div class="testo"><strong>${esc(c.nome)}</strong>
          <span>${esc(PR_TIPI[c.tipo] || "Altro")}${c.telefono ? " · " + esc(c.telefono) : ""}${c.email ? " · " + esc(c.email) : ""}${c.nota ? " · " + esc(c.nota) : ""} · in ${usi(c)} uscite</span>
          ${PR_STRUTTURE.includes(c.tipo) ? `<span>${c.struttura && c.struttura.aggiornata ? `Scheda aggiornata il ${esc(prData(c.struttura.aggiornata))}, dichiarato da ${esc(c.struttura.dichiaratoDa)}` : "Scheda struttura da compilare"}</span>` : ""}
        </div>
        <div class="azioni-persona">
          ${PR_STRUTTURE.includes(c.tipo) ? `<a class="btn secondario piccolo" href="#struttura/${c.id}">Scheda</a>` : ""}
          <button class="btn icona" data-azione="pr-contatto-elimina" data-c="${c.id}" aria-label="Cancella ${esc(c.nome)}" title="Cancella">✕</button>
        </div></div>`).join("") : `<p class="vuoto">Rubrica vuota.</p>`}
    </section>
    <form class="box modulo" data-form="pr-contatto">
      <span class="eti">Nuovo contatto</span>
      <label for="pr-c-tipo">Tipo</label>
      <select id="pr-c-tipo" name="tipo">${Object.entries(PR_TIPI).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select>
      <label for="pr-c-nome">Nome *</label><input id="pr-c-nome" name="nome" required maxlength="60">
      <div class="due"><div><label for="pr-c-tel">Telefono</label><input id="pr-c-tel" name="telefono" type="tel" maxlength="30"></div>
        <div><label for="pr-c-email">Email</label><input id="pr-c-email" name="email" type="email" maxlength="80"></div></div>
      <label for="pr-c-nota">Nota</label><input id="pr-c-nota" name="nota" maxlength="120" placeholder="Es. chiamare dopo le 18">
      <button class="btn primario" type="submit">Salva in rubrica</button>
    </form>
    <p class="nota">✕ cancella il contatto dalla rubrica e da tutte le uscite. Nell'app vera vale anche come cancellazione su richiesta dell'interessato.</p>`;
};

V.struttura = (id) => {
  prInit();
  const c = prContatto(id);
  if (!c || !PR_STRUTTURE.includes(c.tipo)) return `${indietro("#rubrica", "Rubrica")}<h1>Struttura non trovata</h1><p>Forse è stata cancellata dalla rubrica.</p>`;
  const s = c.struttura || { servizi: [], orarioCena: "", note: "", dichiaratoDa: "", aggiornata: null, allergeni: null };
  const vecchia = s.aggiornata && giorniA(s.aggiornata) < -365;
  return `${indietro("#rubrica", "Rubrica")}
    <h1>${esc(c.nome)}</h1>
    <div class="chips"><span class="chip c-info">${esc(PR_TIPI[c.tipo])}</span>
      ${s.aggiornata ? `<span class="chip ${vecchia ? "c-attenzione" : "c-ok"}">Aggiornata il ${esc(prData(s.aggiornata))}${vecchia ? ": da riverificare" : ""}</span><span class="chip c-info">dichiarato da ${esc(s.dichiaratoDa)}</span>` : `<span class="chip c-bozza">Da compilare</span>`}</div>
    <form class="box modulo" data-form="pr-struttura" data-c="${c.id}">
      <span class="eti">Servizi</span>
      <div class="pr-servizi">${PR_SERVIZI[c.tipo].map((v, i) => `<label class="spunta"><input type="checkbox" name="s${i}" ${s.servizi.includes(v) ? "checked" : ""}> ${esc(v)}</label>`).join("")}</div>
      <label for="pr-s-cena">${c.tipo === "ristorante" ? "Orari" : "Orario della cena"}</label><input id="pr-s-cena" name="orarioCena" maxlength="40" value="${esc(s.orarioCena)}" placeholder="Es. 19:30">
      <label for="pr-s-note">Note (camere, accesso, pagamento)</label><textarea id="pr-s-note" name="note" rows="3" maxlength="400">${esc(s.note)}</textarea>
      <label for="pr-s-da">Dichiarato da *</label><input id="pr-s-da" name="dichiaratoDa" required maxlength="60" value="${esc(s.dichiaratoDa)}" placeholder="Es. gestore, al telefono">
      <button class="btn primario" type="submit">Salva la scheda</button>
      <p class="nota">Al salvataggio la data di aggiornamento diventa oggi. Sono informazioni dichiarate: Gruvia non le verifica.</p>
    </form>
    <section class="box">
      <span class="eti">Allergeni e diete</span>
      ${s.allergeni ? `<p>${esc(s.allergeni.testo)}</p><p class="nota">Confermato direttamente da ${esc(s.allergeni.chi)} il ${esc(prData(s.allergeni.il))}.</p>
        <button class="btn secondario piccolo" data-azione="pr-allergeni-togli" data-c="${c.id}">Togli l'informazione</button>`
      : `<p class="nota">Nessuna informazione. Si scrive solo dopo una conferma diretta della struttura: l'app non la deduce e non la propone mai.</p>`}
      <form class="modulo" data-form="pr-allergeni" data-c="${c.id}">
        <label for="pr-a-testo">Cosa ha confermato la struttura</label><textarea id="pr-a-testo" name="testo" rows="2" maxlength="300" required placeholder="Es. cucina senza glutine su richiesta, avvisare 3 giorni prima"></textarea>
        <div class="due"><div><label for="pr-a-chi">Chi l'ha confermato</label><input id="pr-a-chi" name="chi" maxlength="60" required></div>
          <div><label for="pr-a-il">Quando</label><input id="pr-a-il" name="il" type="date" required></div></div>
        <label class="spunta"><input type="checkbox" name="diretta" required> L'ho chiesto direttamente alla struttura (telefono, email o di persona)</label>
        <button class="btn secondario" type="submit">Salva con conferma diretta</button>
      </form>
    </section>`;
};

// Logistica dell'uscita: fornitori dalla rubrica, schede struttura e camere.
V.logistica = (id) => {
  const u = uscita(id);
  if (!u) return nonTrovata();
  prInit();
  const R = S.leader.rubrica, scelti = u.fornitori || [];
  return `${indietro(`#uscita/${u.id}`, u.titolo)}
    <h1>Logistica</h1>
    <section class="box">
      <span class="eti">Fornitori di questa uscita</span>
      ${R.length ? R.map((c) => `<label class="spunta"><input type="checkbox" data-azione="pr-fornitore" data-id="${u.id}" data-c="${c.id}" ${scelti.includes(c.id) ? "checked" : ""}> <span><b>${esc(c.nome)}</b> · ${esc(PR_TIPI[c.tipo] || "Altro")}${c.telefono ? " · " + esc(c.telefono) : ""}</span></label>`).join("") : `<p class="nota">La rubrica è vuota.</p>`}
      <a class="btn secondario" href="#rubrica">Apri la rubrica</a>
    </section>
    ${R.filter((c) => scelti.includes(c.id) && PR_STRUTTURE.includes(c.tipo)).map((c) => `<section class="box">
      <div class="riga"><span class="eti">${esc(c.nome)}</span><a class="btn secondario piccolo" href="#struttura/${c.id}">Scheda</a></div>
      ${c.struttura ? `<p>${c.struttura.servizi.map(esc).join(" · ") || "Nessun servizio spuntato"}</p>
        <p class="nota">${c.struttura.orarioCena ? "Cena " + esc(c.struttura.orarioCena) + " · " : ""}${c.struttura.aggiornata ? `Aggiornata il ${esc(prData(c.struttura.aggiornata))}, dichiarato da ${esc(c.struttura.dichiaratoDa)}.` : "Scheda dei servizi da compilare."}${c.struttura.allergeni ? " Allergeni: confermati direttamente." : ""}</p>` : `<p class="nota">Scheda da compilare.</p>`}
    </section>`).join("")}
    <section class="box">
      <span class="eti">Camere</span>
      <p class="nota">Dalle preferenze dei partecipanti l'app propone una rooming list; la modifichi tu e la mandi alla struttura solo dopo la conferma.</p>
      <a class="btn primario" href="#camere/${u.id}">Assistente camere</a>
    </section>`;
};

// ---------- F73: assistente camere ----------
function prRooming(u) {
  const conf = u.partecipanti.filter((p) => p.stato === "confermato");
  if (!u.rooming) return null;
  const vivi = new Set(conf.map((p) => p.id));
  const camere = u.rooming.camere.map((c) => ({ capienza: c.capienza, persone: c.persone.filter((id) => vivi.has(id)) }));
  const dentro = new Set(camere.flatMap((c) => c.persone));
  return { camere, nonSistemati: conf.filter((p) => !dentro.has(p.id)).map((p) => p.id), note: u.rooming.note || [], confermata: u.rooming.confermata };
}
function prTestoRooming(u, r) {
  const c = u.camere && prContatto(u.camere.struttura);
  let ospite = 0;
  const nome = (id) => { const p = u.partecipanti.find((x) => x.id === id); return p && p.consensoStruttura && p.consensoStruttura.valore ? p.nome : `Ospite ${++ospite}`; };
  const righe = r.camere.map((x, i) => ({ x, i })).filter(({ x }) => x.persone.length)
    .map(({ x, i }) => `Camera ${i + 1} (${x.capienza === 1 ? "1 posto" : x.capienza + " posti"}): ${x.persone.map(nome).join(", ")}`);
  const tot = r.camere.reduce((a, x) => a + x.persone.length, 0);
  return `Rooming list per ${c ? c.nome : "la struttura"}\n${u.titolo} · ${dataLunga(u.data)}\n\n${righe.join("\n")}\n\nTotale: ${tot} persone.${ospite ? " Chi non ha dato il consenso è indicato come Ospite." : ""}\n${S.leader.marchio}`;
}

V.camere = (id) => {
  const u = uscita(id);
  if (!u) return nonTrovata();
  prInit();
  u.camere ??= { struttura: null, capienze: [] };
  const conf = u.partecipanti.filter((p) => p.stato === "confermato");
  const strutture = S.leader.rubrica.filter((c) => ["rifugio", "hotel"].includes(c.tipo));
  const r = prRooming(u);
  const nomeDi = (pid) => (u.partecipanti.find((p) => p.id === pid) || {}).nome || "";
  const posti = u.camere.capienze.reduce((a, b) => a + b, 0);
  const sposta = (pid, attuale) => `<label class="visuale-nascosta" for="pr-sp-${pid}">Camera di ${esc(nomeDi(pid))}</label>
    <select id="pr-sp-${pid}" class="selettore" data-azione="pr-sposta" data-id="${u.id}" data-p="${pid}">
      ${r.camere.map((c, i) => `<option value="${i}" ${i === attuale ? "selected" : ""}>Camera ${i + 1}</option>`).join("")}<option value="-1" ${attuale === -1 ? "selected" : ""}>Senza camera</option></select>`;
  return `${indietro(`#logistica/${u.id}`, "Logistica")}
    <h1>Assistente camere</h1>
    <div class="chips"><span class="chip c-ai">✦ Automatico</span><span class="chip c-info">${conf.length} confermati</span><span class="chip ${posti >= conf.length ? "c-ok" : "c-attenzione"}">${posti} posti letto</span></div>
    <p class="nota">La proposta segue regole fisse: prima chi vuole stare insieme, poi le singole, poi chi chiede una camera tranquilla. Non usa AI esterne né dati sanitari. Decidi tu.</p>
    <form class="box modulo" data-form="pr-capienze" data-id="${u.id}">
      <span class="eti">Struttura e camere</span>
      <label for="pr-cm-str">Struttura</label>
      <select id="pr-cm-str" name="struttura"><option value="">Nessuna struttura della rubrica</option>${strutture.map((c) => `<option value="${c.id}" ${u.camere.struttura === c.id ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}</select>
      <label for="pr-cm-cap">Posti per camera, separati da virgola</label>
      <input id="pr-cm-cap" name="capienze" maxlength="90" required value="${esc(u.camere.capienze.join(", "))}" placeholder="Es. 4, 4, 2, 2, 1">
      <button class="btn secondario" type="submit">Salva le camere</button>
    </form>
    <section class="box elenco-persone">
      <span class="eti">Preferenze (campo di esempio)</span>
      ${conf.length ? conf.map((p) => { const pr = p.prefCamera || { tipo: "indifferente" }; return `<div class="persona">
        <div class="testo"><strong>${esc(p.nome)}</strong><span>Nome alla struttura: ${p.consensoStruttura && p.consensoStruttura.valore ? "consenso sì" : "nessun consenso, compare come Ospite"}</span></div>
        <label class="visuale-nascosta" for="pr-pf-${p.id}">Preferenza di ${esc(p.nome)}</label>
        <select id="pr-pf-${p.id}" class="selettore" data-azione="pr-pref-tipo" data-id="${u.id}" data-p="${p.id}">${Object.entries(PR_PREF).map(([k, v]) => `<option value="${k}" ${pr.tipo === k ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>
        ${pr.tipo === "insieme" ? `<label class="visuale-nascosta" for="pr-pc-${p.id}">Con chi</label><select id="pr-pc-${p.id}" class="selettore" data-azione="pr-pref-con" data-id="${u.id}" data-p="${p.id}"><option value="">Con chi?</option>${conf.filter((q) => q !== p).map((q) => `<option value="${q.id}" ${pr.con === q.id ? "selected" : ""}>${esc(q.nome)}</option>`).join("")}</select>` : ""}
      </div>`; }).join("") : `<p class="vuoto">Nessun confermato.</p>`}
    </section>
    <p class="nota">Nell'app vera le preferenze e il consenso a dare il nome alla struttura li indica il partecipante dal suo link personale. Sono preferenze, non dati sanitari.</p>
    <button class="btn primario" data-azione="pr-proponi" data-id="${u.id}">${r ? "Rifai la proposta" : "Proponi la rooming list"}</button>
    ${r ? `<section class="box">
      <div class="riga"><span class="eti">Rooming list</span>${r.confermata ? `<span class="chip c-ok">Confermata</span>` : `<span class="chip c-ai">✦ Proposta automatica, da controllare</span>`}</div>
      ${r.note.map((n) => `<p class="testo-attenzione">${esc(n)}</p>`).join("")}
      ${r.camere.map((c, i) => `<div class="pr-camera"><div class="riga"><b>Camera ${i + 1}</b><span class="chip ${c.persone.length > c.capienza ? "c-errore" : "c-info"}">${c.persone.length}/${c.capienza} posti</span></div>
        ${c.persone.map((pid) => `<div class="persona"><div class="testo"><strong>${esc(nomeDi(pid))}</strong></div>${sposta(pid, i)}</div>`).join("") || `<p class="nota">Vuota</p>`}</div>`).join("")}
      ${r.nonSistemati.length ? `<div class="pr-camera"><b class="testo-errore">Senza camera</b>${r.nonSistemati.map((pid) => `<div class="persona"><div class="testo"><strong>${esc(nomeDi(pid))}</strong></div>${sposta(pid, -1)}</div>`).join("")}</div>` : ""}
      ${r.confermata ? `<span class="eti">Testo per la struttura</span>
        <div class="fumetto pr-lungo">${esc(prTestoRooming(u, r))}</div>
        <button class="btn primario" data-azione="pr-copia-rooming" data-id="${u.id}">Copia il testo per la struttura</button>
        <p class="nota">Solo nomi con consenso e numero di camera: niente preferenze, esigenze o contatti. L'app non invia nulla: lo mandi tu.</p>`
      : `<button class="btn primario" data-azione="pr-rooming-conferma" data-id="${u.id}">Ho controllato: confermo la rooming list</button>
        <p class="nota">Il testo per la struttura compare solo dopo la tua conferma. Ogni modifica toglie la conferma.</p>`}
    </section>` : ""}`;
};

// F73: consenso del partecipante a dare il nome alla struttura, dalla sua pagina personale.
const prVistaP = V.p;
V.p = (codice) => {
  const html = prVistaP(codice);
  let p = null;
  for (const x of S.uscite) { const y = x.partecipanti.find((q) => q.link && q.link.codice === codice); if (y) { p = y; break; } }
  if (!p || Date.now() > p.link.scade) return html;
  // Il pulsante di disdetta può essere tolto da altri moduli: in quel caso si usa il segno successivo.
  const segno = ['<button class="btn secondario testo-errore" data-azione="p-disdici"', '<p class="nota">Questo link è solo tuo', '<div class="powered centrato">'].find((x) => html.includes(x));
  const c = p.consensoStruttura && p.consensoStruttura.valore ? p.consensoStruttura : null;
  const box = `<section class="box"><span class="eti">Camere in struttura</span>
    <p>Se l'uscita prevede un pernottamento, ${esc(prPrimo(S.leader.nome))} manda alla struttura la lista delle camere: solo nome, iniziale del cognome e numero di camera.</p>
    ${c ? `<p class="testo-ok">Consenso dato il ${esc(prDataOra(c.quando))} (informativa ${esc(c.versione)}).</p>
      <button class="btn secondario" data-azione="pr-p-consenso" data-codice="${esc(codice)}" data-valore="no">Ritira il consenso</button>`
    : `<p class="nota">Senza consenso nella lista compari come "Ospite".</p>
      <button class="btn secondario" data-azione="pr-p-consenso" data-codice="${esc(codice)}" data-valore="si">Acconsento a dare il mio nome alla struttura</button>`}
  </section>`;
  return segno ? html.replace(segno, box + segno) : html + box;
};

// ---------- eventi ----------
function prDueTocchi(el, testo) {
  if (el.dataset.conferma === "si") return true;
  el.dataset.conferma = "si"; el.textContent = testo; el.classList.add("pericolo");
  return false;
}

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-azione^='pr-']");
  if (!el || el.tagName === "INPUT" || el.tagName === "SELECT") return;
  const L = S.leader, u = el.dataset.id ? uscita(el.dataset.id) : null;
  switch (el.dataset.azione) {
    case "pr-scad-elimina": {
      const s = L.scadenze[Number(el.dataset.i)];
      if (!s || !prDueTocchi(el, "Sicuro?")) return;
      L.scadenze.splice(Number(el.dataset.i), 1); avviso("Scadenza eliminata"); break;
    }
    case "pr-abb-paga": {
      const A = L.abbonamento, o = PR_OFFERTE[A.scelta]; if (!o) return;
      const dal = new Date().toISOString();
      Object.assign(A, { stato: "attivo", dal, rinnovo: prDopoMesi(dal, o.mesi), disdetto: null });
      avviso("Simulazione: abbonamento attivo. Nessun pagamento reale"); break;
    }
    case "pr-abb-annulla": L.abbonamento.stato = L.abbonamento.prima || "nessuno"; if (L.abbonamento.sceltaPrima !== undefined) L.abbonamento.scelta = L.abbonamento.sceltaPrima; avviso("Nessun pagamento: torni al profilo"); break;
    case "pr-abb-disdici":
      if (!prDueTocchi(el, "Tocca di nuovo per disdire")) return;
      Object.assign(L.abbonamento, { stato: "disdetto", disdetto: new Date().toISOString() }); avviso("Abbonamento disdetto: resta attivo fino al rinnovo"); break;
    case "pr-copia-riepilogo": case "pr-copia-invito": {
      if (!u) return;
      const k = el.dataset.azione === "pr-copia-riepilogo" ? "riepilogo" : "invito";
      u.dopo ??= {}; u.dopo[k] = new Date().toISOString(); S.eventi.messaggiCopiati++; salva();
      copia(prTesti(u)[k], "Testo copiato: incollalo nel gruppo WhatsApp"); mostra(); return;
    }
    case "pr-link-feedback": {
      const p = u && u.partecipanti.find((x) => x.id === Number(el.dataset.p)); if (!p) return;
      // Codice casuale da 128 bit, diverso dal link dell'iscrizione; un nuovo link sostituisce il precedente.
      p.linkFeedback = { codice: codiceCasuale(), scade: Date.now() + 14 * 86400000 };
      u.dopo ??= {}; u.dopo.feedback = new Date().toISOString(); S.eventi.messaggiCopiati++; salva();
      copia(prTestoFeedback(u, p), `Messaggio per ${p.nome} copiato: mandalo in privato`); mostra(); return;
    }
    case "pr-copia-community": copia(prLink("entra/" + L.community.codice), "Link copiato: incollalo nel generatore di QR"); return;
    case "pr-nuovo-codice":
      if (!prDueTocchi(el, "Tocca di nuovo: il vecchio QR smette di funzionare")) return;
      L.community.codice = codiceCasuale(); avviso("Nuovo link creato: rifai il QR"); break;
    case "pr-contatto-elimina": {
      const c = prContatto(el.dataset.c); if (!c || !prDueTocchi(el, "Sicuro?")) return;
      L.rubrica = L.rubrica.filter((x) => x !== c);
      for (const x of S.uscite) { if (x.fornitori) x.fornitori = x.fornitori.filter((f) => f !== c.id); if (x.camere && x.camere.struttura === c.id) x.camere.struttura = null; }
      avviso("Contatto cancellato dalla rubrica e dalle uscite"); break;
    }
    case "pr-allergeni-togli": { const c = prContatto(el.dataset.c); if (!c || !c.struttura || !prDueTocchi(el, "Sicuro?")) return; c.struttura.allergeni = null; avviso("Informazione sugli allergeni tolta"); break; }
    case "pr-proponi": {
      if (!u) return;
      u.camere ??= { struttura: null, capienze: [] };
      if (!u.camere.capienze.length) { avviso("Indica prima i posti per camera, es. 4, 4, 2."); return; }
      const persone = u.partecipanti.filter((p) => p.stato === "confermato").map((p) => ({ id: p.id, tipo: (p.prefCamera && p.prefCamera.tipo) || "indifferente", con: p.prefCamera && p.prefCamera.con }));
      const r = prProponiCamere(persone, u.camere.capienze);
      u.rooming = { camere: r.camere, note: r.note, confermata: null };
      avviso("Proposta pronta: controllala e modificala"); break;
    }
    case "pr-rooming-conferma": {
      if (!u || !u.rooming) return;
      const r = prRooming(u);
      if (r.camere.some((c) => c.persone.length > c.capienza)) { avviso("Una camera supera i posti: sposta qualcuno prima di confermare."); return; }
      if (r.nonSistemati.length) { avviso(`${r.nonSistemati.length} persone sono senza camera: aggiungi posti o sistemale prima di confermare.`); return; }
      u.rooming.confermata = new Date().toISOString(); avviso("Rooming list confermata"); break;
    }
    case "pr-copia-rooming": { if (!u || !u.rooming || !u.rooming.confermata) return; S.eventi.messaggiCopiati++; salva(); copia(prTestoRooming(u, prRooming(u)), "Testo copiato: mandalo tu alla struttura"); return; }
    case "pr-p-consenso": {
      let p = null;
      for (const x of S.uscite) { const y = x.partecipanti.find((q) => q.link && q.link.codice === el.dataset.codice); if (y) p = y; }
      if (!p || Date.now() > p.link.scade) { mostra(); return; }
      const valore = el.dataset.valore === "si", quando = new Date().toISOString();
      p.consensoStruttura = { valore, quando, versione: VERSIONE_INFORMATIVA };
      (p.consensi ??= []).push({ tipo: "nome alla struttura", valore, quando, versione: VERSIONE_INFORMATIVA });
      avviso(valore ? "Consenso registrato" : "Consenso ritirato: compari come Ospite"); break;
    }
    default: return;
  }
  salva(); mostra();
});

document.addEventListener("change", (e) => {
  const el = e.target, az = el.dataset ? el.dataset.azione : "";
  if (!az || !az.startsWith("pr-")) return;
  const u = el.dataset.id ? uscita(el.dataset.id) : null;
  const p = u && el.dataset.p ? u.partecipanti.find((x) => x.id === Number(el.dataset.p)) : null;
  switch (az) {
    case "pr-scad-data": {
      const s = S.leader.scadenze[Number(el.dataset.i)];
      if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(el.value)) { avviso("Scegli una data valida."); return; }
      s.data = el.value; avviso("Data aggiornata"); break;
    }
    case "pr-fornitore": {
      if (!u) return;
      const cid = Number(el.dataset.c);
      u.fornitori = (u.fornitori || []).filter((x) => x !== cid);
      if (el.checked) u.fornitori.push(cid);
      break;
    }
    case "pr-pref-tipo": if (!p || !PR_PREF[el.value]) return; p.prefCamera = { tipo: el.value, con: el.value === "insieme" && p.prefCamera ? p.prefCamera.con : null }; break;
    case "pr-pref-con": if (!p) return; p.prefCamera = { tipo: "insieme", con: Number(el.value) || null }; break;
    case "pr-sposta": {
      if (!u || !u.rooming || !p) return;
      const dest = Number(el.value);
      for (const c of u.rooming.camere) c.persone = c.persone.filter((x) => x !== p.id);
      if (dest >= 0 && u.rooming.camere[dest]) u.rooming.camere[dest].persone.push(p.id);
      u.rooming.confermata = null;
      break;
    }
    default: return;
  }
  salva(); mostra();
});

document.addEventListener("submit", (e) => {
  const f = e.target, nome = f.dataset.form || "";
  if (!nome.startsWith("pr-")) return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(f));
  const L = S.leader;
  const testo = (k, max) => String(d[k] || "").trim().slice(0, max);
  switch (nome) {
    case "pr-titoli":
      if (!testo("titolo", 120)) { avviso("Scrivi almeno un titolo professionale."); return; }
      Object.assign(L, { titolo: testo("titolo", 120), ente: testo("ente", 80), zone: testo("zone", 120) });
      avviso("Salvato come dichiarato dal leader"); break;
    case "pr-scad-nuova":
      if (!testo("voce", 60) || !/^\d{4}-\d{2}-\d{2}$/.test(d.data || "")) { avviso("Scrivi la voce e scegli la data."); return; }
      L.scadenze.push({ voce: testo("voce", 60), data: d.data }); avviso("Scadenza aggiunta"); break;
    case "pr-abb":
      if (!PR_OFFERTE[d.offerta]) { avviso("Scegli un piano."); return; }
      if (L.abbonamento.stato !== "checkout") { L.abbonamento.prima = L.abbonamento.stato; L.abbonamento.sceltaPrima = L.abbonamento.scelta ?? null; }
      L.abbonamento.scelta = d.offerta; L.abbonamento.stato = "checkout"; break;
    case "pr-feedback": {
      const t = prTrovaFeedback(f.dataset.codice);
      if (!t || Date.now() > t.p.linkFeedback.scade) { mostra(); return; }
      const voto = Number(d.voto);
      if (!(voto >= 1 && voto <= 5 && Number.isInteger(voto))) { avviso("Scegli un voto da 1 a 5."); return; }
      t.u.feedback = (t.u.feedback || []).filter((r) => r.pId !== t.p.id);
      t.u.feedback.push({ pId: t.p.id, voto, commento: testo("commento", 300), quando: new Date().toISOString() });
      avviso("Grazie: risposta registrata"); break;
    }
    case "pr-entra": {
      if (f.dataset.codice !== L.community.codice) { mostra(); return; }
      if (!d.consenso) { avviso("Per entrare nel canale serve il consenso."); return; }
      L.community.consensi.push({ quando: new Date().toISOString(), versione: VERSIONE_INFORMATIVA });
      prEntrato = f.dataset.codice; avviso("Consenso registrato"); break;
    }
    case "pr-canale": {
      const url = testo("canale", 200);
      if (!/^https:\/\/(whatsapp\.com\/channel\/|chat\.whatsapp\.com\/)[A-Za-z0-9_-]+$/.test(url)) { avviso("Incolla il link del canale: deve iniziare con https://whatsapp.com/channel/ o https://chat.whatsapp.com/."); return; }
      L.community.canale = url; avviso("Link del canale salvato"); break;
    }
    case "pr-contatto": {
      if (!testo("nome", 60)) { avviso("Scrivi il nome del contatto."); return; }
      const tipo = PR_TIPI[d.tipo] ? d.tipo : "altro";
      L.rubrica.push({ id: nuovoId(), tipo, nome: testo("nome", 60), telefono: testo("telefono", 30), email: testo("email", 80), nota: testo("nota", 120), struttura: null });
      avviso("Contatto salvato in rubrica"); break;
    }
    case "pr-struttura": {
      const c = prContatto(f.dataset.c); if (!c) return;
      if (!testo("dichiaratoDa", 60)) { avviso("Scrivi chi ha dichiarato i servizi, es. gestore al telefono."); return; }
      const servizi = PR_SERVIZI[c.tipo].filter((_, i) => d["s" + i]);
      c.struttura = { ...(c.struttura || { allergeni: null }), servizi, orarioCena: testo("orarioCena", 40), note: testo("note", 400), dichiaratoDa: testo("dichiaratoDa", 60), aggiornata: isoLocale(new Date()) };
      avviso("Scheda salvata, aggiornata a oggi"); break;
    }
    case "pr-allergeni": {
      const c = prContatto(f.dataset.c); if (!c) return;
      if (!d.diretta || !testo("testo", 300) || !testo("chi", 60) || !/^\d{4}-\d{2}-\d{2}$/.test(d.il || "")) { avviso("Sugli allergeni serve la conferma diretta: chiedi alla struttura e scrivi chi e quando."); return; }
      if (d.il > isoLocale(new Date())) { avviso("La data della conferma non può essere nel futuro."); return; }
      // Solo gli allergeni: la scheda dei servizi resta da compilare, quindi niente data di aggiornamento.
      c.struttura ??= { servizi: [], orarioCena: "", note: "", dichiaratoDa: "", aggiornata: null };
      c.struttura.allergeni = { testo: testo("testo", 300), chi: testo("chi", 60), il: d.il };
      avviso("Informazione salvata con conferma diretta"); break;
    }
    case "pr-capienze": {
      const u = uscita(f.dataset.id); if (!u) return;
      const cap = prCapienze(d.capienze);
      if (!cap.length) { avviso("Scrivi i posti per camera come numeri, es. 4, 4, 2."); return; }
      u.camere = { struttura: prContatto(d.struttura) ? Number(d.struttura) : null, capienze: cap };
      u.rooming = null; avviso("Camere salvate: rifai la proposta"); break;
    }
    default: return;
  }
  salva(); mostra();
});
