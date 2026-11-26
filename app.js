// Gruvia · demo installabile. Tutti i dati sono di esempio e restano solo su questo telefono.
"use strict";

const CHIAVE = "campobase-demo-v3"; // chiave nuova: chi aveva i dati vecchi riparte dagli esempi aggiornati
const MARGINE_RIENTRO = 30; // minuti tra ora limite di rientro e tramonto
const C = Calcoli;

// ---------- dati di esempio ----------
// Data locale AAAA-MM-GG: toISOString userebbe l'ora UTC e in Italia sposterebbe la data al giorno prima.
const isoLocale = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function prossimoGiorno(giornoSettimana, settimaneDopo = 0) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + ((giornoSettimana - d.getDay() + 7) % 7 || 7) + settimaneDopo * 7);
  return isoLocale(d);
}

function datiDemo() {
  const fra = (giorni) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + giorni); return isoLocale(d); };
  return {
    versione: 1,
    leader: {
      nome: "Enrico", marchio: "Sentieri di Enrico",
      titolo: "Guida ambientale escursionistica", zone: "Appennino umbro-marchigiano",
      contatto: "WhatsApp 333 000 0000 (esempio)", piva: "01234567890 (esempio)",
      scadenze: [{ voce: "RC professionale", data: fra(66) }, { voce: "Aggiornamento BLSD", data: fra(170) }],
    },
    prossimoId: 100,
    uscite: [
      {
        id: 1, titolo: "Anello del Monte Cucco", descrittore: "trekking, faggete e grotte",
        data: prossimoGiorno(6), oraPartenza: "09:30", ritrovo: { nome: "Parcheggio di Pian di Spilli", lat: 43.367, lon: 12.733 },
        km: 14.2, dislivello: 780, attivita: "trekking", lingua: "it", dettagli: { difficolta: "E", quotaMax: 1566 }, prezzo: 25, posti: 12, minimo: 7, stato: "pubblicata",
        condizioni: "Rimborso totale fino a 48 ore prima; dopo, nessun rimborso salvo annullamento per meteo.",
        spese: [{ voce: "Compenso guida d'appoggio", importo: 90 }, { voce: "Assicurazione giornaliera", importo: 48 }, { voce: "Parcheggio e navetta", importo: 30 }],
        consultazioni: [], presenze: {},
        spunti: [
          { id: 1, testo: "La Grotta di Monte Cucco è una delle cavità più profonde d'Italia.", ai: true, fonte: "", stato: "da convalidare" },
          { id: 2, testo: "Le faggete del versante nord sono parte del Parco regionale del Monte Cucco.", ai: false, fonte: "Conoscenza diretta del leader", stato: "convalidato" },
        ],
        partecipanti: [
          { id: 1, nome: "Giulia R.", stato: "confermato", checklist: true, arrivo: "auto, 8:45" },
          { id: 2, nome: "Luca B.", stato: "confermato", checklist: true, esigenza: { etichetta: "vegetariano", consenso: fra(-5) } },
          { id: 3, nome: "Anna P.", stato: "confermato", checklist: false },
          { id: 4, nome: "Paolo S.", stato: "confermato", checklist: true },
          { id: 5, nome: "Elena M.", stato: "confermato", checklist: false },
          { id: 6, nome: "Davide C.", stato: "confermato", checklist: true },
          { id: 7, nome: "Chiara F.", stato: "confermato", checklist: true },
          { id: 8, nome: "Roberto N.", stato: "confermato", checklist: false },
          { id: 9, nome: "Ilaria G.", stato: "confermato", checklist: true },
          { id: 10, nome: "Marco T.", stato: "richiesta", checklist: false },
          { id: 11, nome: "Sara L.", stato: "richiesta", checklist: false },
          { id: 12, nome: "Franco V.", stato: "lista", checklist: false },
        ],
      },
      {
        id: 2, titolo: "Gola del Furlo al tramonto", descrittore: "trekking, falesie e fiume",
        data: prossimoGiorno(0, 2), oraPartenza: "13:30", ritrovo: { nome: "Abbazia di San Vincenzo al Furlo", lat: 43.643, lon: 12.715 },
        km: 9.6, dislivello: 520, attivita: "trekking", lingua: "it", dettagli: { difficolta: "E", quotaMax: 812 }, prezzo: 20, posti: 15, minimo: 8, stato: "bozza",
        condizioni: "Rimborso totale fino a 72 ore prima.", spese: [{ voce: "Assicurazione giornaliera", importo: 60 }],
        consultazioni: [], presenze: {}, spunti: [], partecipanti: [],
      },
      {
        id: 3, titolo: "Eremi del Monte Subasio", descrittore: "trekking, boschi e spiritualità",
        data: fra(-12), oraPartenza: "09:00", ritrovo: { nome: "Eremo delle Carceri", lat: 43.067, lon: 12.638 },
        km: 12.0, dislivello: 640, attivita: "trekking", lingua: "it", dettagli: { difficolta: "E", quotaMax: 1290 }, prezzo: 22, posti: 12, minimo: 6, stato: "conclusa",
        condizioni: "Rimborso totale fino a 48 ore prima.", spese: [{ voce: "Assicurazione giornaliera", importo: 48 }],
        consultazioni: [], presenze: {}, spunti: [],
        partecipanti: [
          { id: 20, nome: "Giulia R.", stato: "confermato", checklist: true },
          { id: 21, nome: "Paolo S.", stato: "confermato", checklist: true },
          { id: 22, nome: "Chiara F.", stato: "confermato", checklist: true },
          { id: 23, nome: "Ilaria G.", stato: "confermato", checklist: true },
          { id: 24, nome: "Davide C.", stato: "confermato", checklist: true },
          { id: 25, nome: "Elena M.", stato: "confermato", checklist: true },
          { id: 26, nome: "Marco T.", stato: "confermato", checklist: true },
        ],
      },
    ],
  };
}

// ---------- stato salvato solo sul telefono ----------
const DURATA_SESSIONE_GIORNI = 7;   // F105: la sessione scade e si rientra con un nuovo link
const CONSERVAZIONE_GIORNI = 30;    // F24: i dati dei partecipanti si cancellano 30 giorni dopo l'uscita
const VERSIONE_INFORMATIVA = "1.0 del 26/11/2026";
let S;
function carica() {
  try { S = JSON.parse(localStorage.getItem(CHIAVE)); } catch (e) { S = null; }
  if (!S || S.versione !== 1) { S = datiDemo(); salva(); }
  S.account ??= null;
  S.eventi ??= { accessi: 0, usciteCreate: 0, tempiCreazione: [], messaggiCopiati: 0, richiesteRicevute: 0 };
  LINGUA = S.lingua || "it";
  cancellazioneAutomatica();
}

// F24: dopo la scadenza i dati dei partecipanti vengono cancellati; resta solo il numero di presenti.
function cancellazioneAutomatica() {
  let cancellati = 0;
  for (const u of S.uscite) {
    if (u.partecipanti.length && giorniA(u.data) < -CONSERVAZIONE_GIORNI) {
      u.presentiArchivio = u.partecipanti.filter((p) => p.stato === "confermato").length;
      cancellati += u.partecipanti.length;
      u.partecipanti = []; u.presenze = {};
    }
  }
  if (cancellati) salva();
}
const dataCancellazione = (u) => { const d = new Date(u.data + "T12:00"); d.setDate(d.getDate() + CONSERVAZIONE_GIORNI); return d.toLocaleDateString("it-IT"); };
const sessioneValida = () => S.account && S.account.sessioneScade > Date.now();

// Codice casuale da 128 bit per i link dei partecipanti (F26). Nell'app vera il server ne conserva solo l'hash.
function codiceCasuale() {
  const b = new Uint8Array(16); crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function scarica(nome, oggetto) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(oggetto, null, 2)], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nome });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// F19: un'uscita pubblicata con tutti i posti confermati risulta piena.
function statoEff(u) {
  return u.stato === "pubblicata" && conti(u).confermati >= u.posti ? "piena" : u.stato;
}
function salva() {
  try { localStorage.setItem(CHIAVE, JSON.stringify(S)); }
  catch (e) { avviso("Non riesco a salvare sul telefono: lo spazio del browser è pieno o bloccato."); }
}
const uscita = (id) => S.uscite.find((u) => u.id === Number(id));
const nuovoId = () => ++S.prossimoId;

// ---------- utilità ----------
// Tutto il testo inserito passa da esc(): nessun HTML dei dati entra nella pagina.
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dataLunga = (iso) => new Date(iso + "T12:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
const dataBreve = (iso) => new Date(iso + "T12:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
const giorniA = (iso) => Math.round((new Date(iso + "T12:00") - new Date(new Date().toDateString() + " 12:00")) / 86400000);

let timerAvviso;
function avviso(testo) {
  const t = document.getElementById("toast");
  t.textContent = testo; t.hidden = false;
  clearTimeout(timerAvviso);
  timerAvviso = setTimeout(() => { t.hidden = true; }, 2600);
}

async function copia(testo, messaggio) {
  try { await navigator.clipboard.writeText(testo); avviso(messaggio); }
  catch (e) {
    const area = document.createElement("textarea");
    area.value = testo; document.body.appendChild(area); area.select();
    const ok = document.execCommand && document.execCommand("copy");
    area.remove();
    avviso(ok ? messaggio : "Copia non riuscita: tieni premuto sul testo e scegli Copia.");
  }
}

function conti(u) {
  const p = u.partecipanti;
  return {
    confermati: p.filter((x) => x.stato === "confermato").length,
    richieste: p.filter((x) => x.stato === "richiesta").length,
    lista: p.filter((x) => x.stato === "lista").length,
    senzaChecklist: p.filter((x) => x.stato === "confermato" && !x.checklist),
  };
}

function briefing(u) {
  const giorno = new Date(u.data + "T12:00");
  const tram = C.tramonto(giorno, u.ritrovo.lat, u.ritrovo.lon);
  const limite = C.oraLimiteRientro(tram, MARGINE_RIENTRO);
  const ore = C.durataStimataOre(u.km, u.dislivello);
  const [h, m] = u.oraPartenza.split(":").map(Number);
  const partenza = new Date(giorno); partenza.setHours(h, m, 0, 0);
  const rientro = new Date(partenza.getTime() + ore * 3600000);
  return { tram, limite, ore, rientro, inTempo: limite ? rientro <= limite : true };
}

const STATI_USCITA = { bozza: ["Bozza", "c-bozza"], pubblicata: ["Pubblicata", "c-ok"], piena: ["Piena", "c-attenzione"], annullata: ["Annullata", "c-errore"], conclusa: ["Conclusa", "c-bozza"] };
const chipStato = (s) => `<span class="chip ${STATI_USCITA[s][1]}">${STATI_USCITA[s][0]}</span>`;
const STATI_P = { confermato: ["Confermato", "c-ok"], richiesta: ["Richiesta", "c-info"], lista: ["In lista", "c-attenzione"] };

function intestazioneLeader() {
  const ini = S.leader.marchio.split(" ").map((p) => p[0]).filter((c) => /[A-ZÀ-Ý]/.test(c)).slice(0, 2).join("");
  return `<div class="leader"><div class="avatar">${esc(ini)}</div>
    <div><strong>${esc(S.leader.marchio)}</strong><span class="powered"><img src="icone/icon-192.png" alt="">Powered by Gruvia</span></div></div>`;
}

function indietro(href, testo) { return `<a class="indietro" href="${href}">‹ ${esc(testo)}</a>`; }

// ---------- schermate ----------
const V = {};

V.oggi = () => {
  const prossime = S.uscite.filter((u) => u.stato === "pubblicata" && giorniA(u.data) >= 0).sort((a, b) => a.data.localeCompare(b.data));
  const u = prossime[0];
  const oggiTxt = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric" });
  if (!u) {
    return `${intestazioneLeader()}<h1>Oggi, ${esc(oggiTxt)}</h1>
      <section class="box vuoto"><p>Nessuna uscita pubblicata in programma.</p><a class="btn primario" href="#nuova">Crea un'uscita</a></section>`;
  }
  const k = conti(u), be = C.breakEven(u.prezzo, k.confermati, u.spese), b = briefing(u);
  const quando = giorniA(u.data) === 0 ? "oggi" : giorniA(u.data) === 1 ? "domani" : `tra ${giorniA(u.data)} giorni`;
  const percConf = Math.min(100, (k.confermati / u.posti) * 100), percPar = Math.min(100, (be.pareggio / u.posti) * 100);
  return `${intestazioneLeader()}
    <h1>Oggi, ${esc(oggiTxt)}</h1>
    <a class="box prussia" href="#uscita/${u.id}">
      <div class="riga"><span class="eti">Prossima uscita · ${quando}</span>${chipStato(statoEff(u))}</div>
      <div class="titolo-uscita">${esc(u.titolo)}</div>
      <div class="descrittore">${esc(u.descrittore)}</div>
      <div class="dati">
        <div class="dato"><b>${k.confermati}/${u.posti}</b><span>confermati</span></div>
        <div class="dato"><b>${k.richieste}</b><span>richieste</span></div>
        <div class="dato"><b>${k.lista}</b><span>in lista</span></div>
      </div>
    </a>
    <section class="box">
      <div class="riga"><span class="eti">Chi manca</span><span class="chip ${k.senzaChecklist.length ? "c-attenzione" : "c-ok"}">${k.senzaChecklist.length ? k.senzaChecklist.length + " persone" : "Tutto a posto"}</span></div>
      ${k.senzaChecklist.length ? `<p>Non hanno confermato la checklist: ${k.senzaChecklist.map((p) => esc(p.nome)).join(", ").replace(/\.?$/, ".")}</p>
      <button class="btn secondario" data-azione="copia-promemoria" data-id="${u.id}">Copia il promemoria</button>` : `<p>Tutti i confermati hanno visto la checklist.</p>`}
    </section>
    <section class="box">
      <div class="riga"><span class="eti">Break-even</span><b class="${be.mancano ? "testo-attenzione" : "testo-ok"}">${be.mancano ? `mancano ${be.mancano} iscritti` : `+${k.confermati - be.pareggio} oltre il pareggio`}</b></div>
      <div class="barra" role="img" aria-label="${k.confermati} confermati su ${u.posti}, pareggio a ${be.pareggio}"><i style="width:${percConf}%"></i><em style="left:${percPar}%"></em></div>
      <p class="nota">Pareggio a ${be.pareggio} iscritti: ${C.euro(u.prezzo)} × ${k.confermati} = ${C.euro(be.ricavi)}, spese ${C.euro(be.totaleSpese)}.</p>
    </section>
    <section class="box">
      <div class="riga"><span class="eti">Briefing</span><span class="nota">calcolato dal GPX</span></div>
      <div class="dati">
        <div class="dato"><b>${C.ora(b.tram)}</b><span>tramonto</span></div>
        <div class="dato"><b>${C.ora(b.limite)}</b><span>ora limite</span></div>
        <div class="dato"><b>${C.ora(b.rientro)}</b><span>rientro stimato</span></div>
      </div>
      ${b.inTempo ? "" : `<p class="testo-errore">Il rientro stimato supera l'ora limite: anticipa la partenza o accorcia il percorso.</p>`}
    </section>
    <span class="eti">Azioni rapide</span>
    <div class="azioni">
      <a class="btn tasto" href="#messaggi/${u.id}"><span aria-hidden="true">✉</span>Messaggi</a>
      <a class="btn tasto" href="#partecipanti/${u.id}"><span aria-hidden="true">☰</span>Iscritti</a>
      <a class="btn tasto" href="#sentiero/${u.id}"><span aria-hidden="true">⛰</span>Sentiero</a>
    </div>`;
};

let filtroUscite = "programma";
V.uscite = () => {
  const gruppi = {
    programma: S.uscite.filter((u) => u.stato === "pubblicata" && giorniA(u.data) >= 0),
    bozze: S.uscite.filter((u) => u.stato === "bozza"),
    archivio: S.uscite.filter((u) => ["conclusa", "annullata"].includes(u.stato) || (u.stato !== "bozza" && giorniA(u.data) < 0)),
  };
  const lista = gruppi[filtroUscite].sort((a, b) => filtroUscite === "archivio" ? b.data.localeCompare(a.data) : a.data.localeCompare(b.data));
  const nomi = { programma: "In programma", bozze: "Bozze", archivio: "Archivio" };
  return `<h1>${esc(t("titolo_uscite"))}</h1>
    <div class="schede" role="tablist">${Object.keys(nomi).map((k) => `<button role="tab" aria-selected="${k === filtroUscite}" data-azione="filtro" data-valore="${k}">${nomi[k]} <span>${gruppi[k].length}</span></button>`).join("")}</div>
    <div class="elenco">
      ${lista.length ? lista.map((u) => {
        const k = conti(u);
        return `<a class="box riga-uscita" href="#uscita/${u.id}">
          <div class="data-box"><b>${new Date(u.data + "T12:00").getDate()}</b><span>${new Date(u.data + "T12:00").toLocaleDateString("it-IT", { month: "short" })}</span></div>
          <div class="testo"><strong>${esc(u.titolo)}</strong><span>${k.confermati}/${u.posti} confermati · ${C.numero(u.km)} km · ${u.dettagli.difficolta}</span></div>
          ${chipStato(statoEff(u))}</a>`;
      }).join("") : `<p class="vuoto">Nessuna uscita in questa scheda.</p>`}
    </div>
    <a class="btn primario fab" href="#nuova">＋ Nuova uscita</a>`;
};

V.uscita = (id) => {
  const u = uscita(id);
  if (!u) return nonTrovata();
  const b = briefing(u), k = conti(u), be = C.breakEven(u.prezzo, k.confermati, u.spese);
  const ultima = u.consultazioni[u.consultazioni.length - 1];
  const meteo = `https://www.meteoam.it/it/ricerca?query=${encodeURIComponent(u.ritrovo.nome)}`;
  const mapy = `https://mapy.com/it/turisticka?x=${u.ritrovo.lon}&y=${u.ritrovo.lat}&z=14`;
  return `${indietro("#uscite", "Uscite")}
    <h1>${esc(u.titolo)}</h1>
    <div class="chips">${chipStato(statoEff(u))}<span class="chip c-info">Difficoltà ${esc(u.dettagli.difficolta)}</span><span class="chip c-info">${esc(dataBreve(u.data))}</span></div>
    <nav class="sottomenu" aria-label="Sezioni dell'uscita">
      <a href="#partecipanti/${u.id}">Iscritti <b>${k.confermati}</b></a><a href="#messaggi/${u.id}">Messaggi</a>
      <a href="#sentiero/${u.id}">Sentiero</a><a href="#pubblica/${u.id}">Pagina</a><a href="#modifica/${u.id}">Modifica</a>
    </nav>
    <section class="box">
      <div class="riga"><span class="eti">Dati del percorso</span><span class="nota">da GPX o scheda</span></div>
      <div class="dati">
        <div class="dato"><b>${C.numero(u.km)} km</b><span>distanza</span></div>
        <div class="dato"><b>+${C.numero(u.dislivello)} m</b><span>dislivello</span></div>
        <div class="dato"><b>${u.dettagli.quotaMax ? C.numero(u.dettagli.quotaMax) + " m" : "—"}</b><span>quota max</span></div>
        <div class="dato"><b>${C.durata(b.ore)}</b><span>durata stimata</span></div>
        <div class="dato"><b>${C.ora(b.tram)}</b><span>tramonto</span></div>
        <div class="dato"><b>${C.ora(b.limite)}</b><span>ora limite</span></div>
      </div>
      <p class="nota">Partenza ${esc(u.oraPartenza)} da ${esc(u.ritrovo.nome)}: rientro stimato ${C.ora(b.rientro)}${b.inTempo ? ", entro l'ora limite." : `, <b class="testo-errore">oltre l'ora limite</b>.`} Durata: km ÷ 4 + dislivello ÷ 400, da confermare.</p>
    </section>
    <section class="box">
      <span class="eti">Meteo e sentiero</span>
      <div class="riga"><span>Aeronautica Militare</span><a class="btn secondario piccolo" href="${meteo}" target="_blank" rel="noopener noreferrer">Apri ↗</a></div>
      <div class="riga"><span>Mapy, sentieri</span><a class="btn secondario piccolo" href="${mapy}" target="_blank" rel="noopener noreferrer">Apri ↗</a></div>
      <p class="nota">${ultima ? `Ultima consultazione ${esc(new Date(ultima.quando).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }))}${ultima.nota ? ` · “${esc(ultima.nota)}”` : ""}` : "Meteo non ancora consultato per questa uscita."}</p>
      <form class="in-linea" data-form="consultazione" data-id="${u.id}">
        <label class="visuale-nascosta" for="nota-meteo">Nota sulla consultazione</label>
        <input id="nota-meteo" name="nota" maxlength="120" placeholder="Nota, es. pioggia debole sabato sera">
        <button class="btn secondario" type="submit">Registra</button>
      </form>
    </section>
    <section class="box">
      <div class="riga"><span class="eti">Break-even</span><b class="${be.mancano ? "testo-attenzione" : "testo-ok"}">${C.euro(be.margine)}</b></div>
      ${u.spese.map((s) => `<div class="riga nota"><span>${esc(s.voce)}</span><span>${C.euro(s.importo)}</span></div>`).join("")}
      <p class="nota">Ricavi previsti ${C.euro(u.prezzo)} × ${k.confermati} confermati = ${C.euro(be.ricavi)}. Pareggio a ${be.pareggio} iscritti. Nessun incasso è registrato nell'app.</p>
    </section>
    <section class="box">
      <span class="eti">Spunti sul territorio</span>
      ${u.spunti.length ? u.spunti.map((s) => `<div class="spunto">
        <div class="riga">${s.ai ? `<span class="chip c-ai">✦ Proposto dall'AI</span>` : `<span class="chip c-info">Del leader</span>`}<span class="chip ${s.stato === "convalidato" ? "c-ok" : "c-attenzione"}">${s.stato === "convalidato" ? "Convalidato" : "Da convalidare"}</span></div>
        <p>${esc(s.testo)}</p>
        ${s.stato === "convalidato" ? `<p class="nota">Fonte: ${esc(s.fonte)}</p>` : `<p class="nota">Non è visibile ai partecipanti finché non aggiungi una fonte o la tua conoscenza diretta.</p>
        <div class="riga"><button class="btn secondario piccolo" data-azione="convalida" data-id="${u.id}" data-spunto="${s.id}">Conosco il posto</button><button class="btn secondario piccolo" data-azione="scarta" data-id="${u.id}" data-spunto="${s.id}">Scarta</button></div>`}
      </div>`).join("") : `<p class="nota">Nessuno spunto per questa uscita.</p>`}
    </section>
    ${u.stato === "bozza" ? `<button class="btn primario" data-azione="pubblica" data-id="${u.id}">Pubblica l'uscita</button>` : ""}
    ${u.stato === "pubblicata" ? `<button class="btn secondario" data-azione="concludi" data-id="${u.id}">Segna come conclusa</button>
      <button class="btn secondario testo-errore" data-azione="annulla" data-id="${u.id}">Annulla l'uscita</button>` : ""}
    ${["conclusa", "annullata"].includes(u.stato) ? `<button class="btn secondario" data-azione="duplica" data-id="${u.id}">Duplica come nuova bozza</button>` : ""}`;
};

V.partecipanti = (id) => {
  const u = uscita(id);
  if (!u) return nonTrovata();
  const k = conti(u);
  const ordine = { richiesta: 0, confermato: 1, lista: 2 };
  const persone = [...u.partecipanti].sort((a, b) => ordine[a.stato] - ordine[b.stato]);
  return `${indietro(`#uscita/${u.id}`, u.titolo)}
    <h1>${esc(t("titolo_iscritti"))}</h1>
    <div class="chips"><span class="chip c-ok">${k.confermati} confermati</span><span class="chip c-info">${k.richieste} richieste</span><span class="chip c-attenzione">${k.lista} in lista</span><span class="chip c-bozza">${u.posti - k.confermati} posti liberi</span></div>
    <section class="box elenco-persone">
      ${persone.length ? persone.map((p) => `<div class="persona">
        <div class="ini">${esc(p.nome.split(" ").map((x) => x[0]).join("").slice(0, 2))}</div>
        <div class="testo"><strong>${esc(p.nome)}</strong>
          <span>${p.stato === "confermato" ? (p.checklist ? "Checklist vista" : "Checklist non ancora vista") : p.stato === "richiesta" ? "In attesa della tua conferma" : "In lista d'attesa"}${p.arrivo ? " · " + esc(p.arrivo) : ""}${p.esigenza ? ` · Esigenza: ${esc(p.esigenza.etichetta)} (consenso ${esc(new Date(p.esigenza.consenso).toLocaleDateString("it-IT"))})` : ""}${p.nota ? ` · Nota: ${esc(p.nota)}` : ""}${(p.consensi || []).map((c) => ` · Consenso ${esc(c.tipo)}: ${c.valore ? "sì" : "no"} (${esc(new Date(c.quando).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }))}, informativa ${esc(c.versione)})`).join("")}</span>
        </div>
        <div class="azioni-persona">
          ${p.stato === "richiesta" ? `<button class="btn primario piccolo" data-azione="conferma" data-id="${u.id}" data-p="${p.id}">Conferma</button>` : ""}
          ${p.stato === "lista" ? `<button class="btn secondario piccolo" data-azione="conferma" data-id="${u.id}" data-p="${p.id}">Dai il posto</button>` : ""}
          ${p.stato === "confermato" && !p.checklist ? `<button class="btn secondario piccolo" data-azione="checklist" data-id="${u.id}" data-p="${p.id}">Vista ✓</button>` : ""}
          <button class="btn icona" data-azione="link-p" data-id="${u.id}" data-p="${p.id}" aria-label="Copia il link personale di ${esc(p.nome)}" title="Link personale">🔗</button>
          <button class="btn icona" data-azione="esporta-p" data-id="${u.id}" data-p="${p.id}" aria-label="Esporta i dati di ${esc(p.nome)}" title="Esporta i dati">⇩</button>
          <button class="btn icona" data-azione="cancella" data-id="${u.id}" data-p="${p.id}" aria-label="Cancella definitivamente ${esc(p.nome)}" title="Cancella definitivamente">✕</button>
        </div></div>`).join("") : u.presentiArchivio ? `<p class="vuoto">I dati dei partecipanti sono stati cancellati ${CONSERVAZIONE_GIORNI} giorni dopo l'uscita. Presenti: ${u.presentiArchivio}.</p>` : `<p class="vuoto">Ancora nessun iscritto. Condividi la pagina dell'uscita per ricevere le richieste.</p>`}
    </section>
    <p class="nota">🔗 copia il link personale (non indovinabile, scade il giorno dopo l'uscita) · ⇩ esporta i dati della persona · ✕ la cancella definitivamente da ogni schermata. Le esigenze sono etichette con consenso esplicito, visibili solo a te.</p>
    ${u.partecipanti.length ? `<p class="nota">I dati di questi partecipanti si cancellano da soli il ${dataCancellazione(u)}.</p>` : ""}
    <a class="btn secondario" href="#pubblica/${u.id}">Apri la pagina dell'uscita</a>`;
};

function messaggiDi(u) {
  const b = briefing(u);
  const giorno = dataLunga(u.data);
  return {
    annuncio: `${u.titolo}: ${giorno}.\n${u.descrittore.charAt(0).toUpperCase() + u.descrittore.slice(1)}. ${C.numero(u.km)} km, +${u.dislivello} m, difficoltà ${u.dettagli.difficolta}.\nRitrovo ${u.oraPartenza.replace(":", ".")} a ${u.ritrovo.nome}. Quota ${u.prezzo} €, ${u.posti} posti.\nPer chiedere un posto: gruvia.app/u/esempio\n${S.leader.marchio}`,
    promemoria: `Ciao a tutti, ${giorno} si parte per ${u.titolo}.\nRitrovo alle ${u.oraPartenza} a ${u.ritrovo.nome}.\n${C.numero(u.km)} km e +${u.dislivello} m: scarponi, giacca impermeabile e 1,5 litri d'acqua.\nChi non l'ha ancora fatto, confermi la checklist dal suo link.\nA presto, ${S.leader.nome.split(" ")[0]}`,
    // Per WhatsApp Eventi: l'evento raccoglie il "ci sono"; la pagina dell'uscita tiene prezzo, condizioni, checklist ed esigenze.
    evento: `TITOLO DELL'EVENTO\n${u.titolo} · ${dataBreve(u.data)}\n\nDESCRIZIONE\n${C.numero(u.km)} km, +${u.dislivello} m, difficoltà ${u.dettagli.difficolta}. Ritrovo ${u.oraPartenza} a ${u.ritrovo.nome}.\nQuota ${u.prezzo} €. Prezzo, condizioni di annullamento e checklist: gruvia.app/u/esempio\nRispondere "ci sono" all'evento non conferma il posto: lo conferma ${S.leader.nome.split(" ")[0]}.`,
    giorno: `Buongiorno! Oggi ${u.titolo}. Ritrovo alle ${u.oraPartenza} a ${u.ritrovo.nome}.\nTramonto alle ${C.ora(b.tram)}: rientriamo entro le ${C.ora(b.limite)}.\nAvete acqua e strati caldi? Ci vediamo lì.`,
  };
}

let tipoMessaggio = "promemoria";
V.messaggi = (id) => {
  const u = uscita(id);
  if (!u) return nonTrovata();
  const m = messaggiDi(u);
  const nomi = { promemoria: "Promemoria", annuncio: "Annuncio", evento: "Evento WhatsApp", giorno: "Del giorno" };
  return `${indietro(`#uscita/${u.id}`, u.titolo)}
    <h1>${esc(t("titolo_messaggi"))}</h1>
    <div class="schede" role="tablist">${Object.keys(nomi).map((k) => `<button role="tab" aria-selected="${k === tipoMessaggio}" data-azione="tipo-msg" data-valore="${k}">${nomi[k]}</button>`).join("")}</div>
    <div class="fumetto" id="testo-msg">${esc(m[tipoMessaggio])}</div>
    <p class="nota">${tipoMessaggio === "evento" ? "In WhatsApp: nel gruppo apri il menu degli allegati, scegli Evento e incolla titolo e descrizione. L'evento raccoglie le adesioni; qui restano conferme, checklist, esigenze e chi manca." : "Il testo nasce dalla scheda dell'uscita e non contiene dati dei partecipanti. L'app non scrive nei gruppi: lo incolli tu."}</p>
    <button class="btn primario" data-azione="copia-msg" data-id="${u.id}">Copia per WhatsApp</button>`;
};

V.sentiero = (id) => {
  const u = uscita(id);
  if (!u) return nonTrovata();
  const b = briefing(u);
  const conf = u.partecipanti.filter((p) => p.stato === "confermato");
  const presenti = conf.filter((p) => u.presenze[p.id]).length;
  return `<div class="sentiero">
    ${indietro(`#uscita/${u.id}`, u.titolo)}
    <div class="stato-rete" id="stato-rete">${navigator.onLine ? "● In linea" : "◌ Senza rete: l'app funziona lo stesso"}</div>
    <h1>${esc(t("titolo_sentiero"))}</h1>
    <section class="box">
      <span class="eti">Ritrovo</span>
      <div class="titolo-uscita">${esc(u.ritrovo.nome)}</div>
      <p class="nota">Partenza ${esc(u.oraPartenza)} · ora limite di rientro ${C.ora(b.limite)} · tramonto ${C.ora(b.tram)}</p>
    </section>
    <section class="box">
      <div class="riga"><span class="eti">Presenze</span><b>${presenti}/${conf.length}</b></div>
      ${conf.map((p) => `<div class="persona"><div class="testo"><strong>${esc(p.nome)}</strong></div>
        <button class="presenza" aria-pressed="${!!u.presenze[p.id]}" data-azione="presenza" data-id="${u.id}" data-p="${p.id}" aria-label="${esc(p.nome)} presente">✓</button></div>`).join("")}
    </section>
    <section class="box">
      <span class="eti">Numeri utili</span>
      <div class="riga"><span>Numero unico di emergenza</span><b>112</b></div>
    </section>
    <p class="nota">Gruvia non è un servizio di soccorso. Nella demo le presenze restano su questo telefono.</p>
  </div>`;
};

V.pubblica = (id) => {
  const u = uscita(id);
  if (!u) return nonTrovata();
  const k = conti(u), liberi = u.posti - k.confermati;
  return `<div class="pubblica">
    <a class="indietro" href="#uscita/${u.id}">‹ Torna all'app del leader</a>
    <div class="leader"><div class="avatar">${esc(S.leader.marchio.split(" ").map((p) => p[0]).filter((c) => /[A-Z]/.test(c)).slice(0, 2).join(""))}</div>
      <div><strong>${esc(S.leader.marchio)}</strong><span class="nota">${esc(S.leader.titolo)} (dichiarato)</span></div></div>
    <div class="hero">
      <svg viewBox="0 0 260 96" aria-hidden="true">
        <path d="M0 96 L0 62 L46 34 L78 52 L120 18 L168 56 L204 38 L260 64 L260 96 Z" fill="#123A6B"/>
        <path d="M0 96 L0 76 L60 60 L118 72 L180 58 L260 80 L260 96 Z" fill="#14213D"/>
        <circle cx="196" cy="20" r="9" fill="#D6336C"/>
        <path d="M30 92 C70 80 96 86 128 74 C160 62 186 70 214 60" fill="none" stroke="#F8F9FA" stroke-width="2.5" stroke-dasharray="2 6" stroke-linecap="round"/>
      </svg>
      <h1>${esc(u.titolo)}</h1>
      <div class="descrittore scuro">${esc(u.descrittore)}</div>
      <p><b>${esc(dataLunga(u.data))}</b> · ritrovo ${esc(u.oraPartenza)} a ${esc(u.ritrovo.nome)}</p>
    </div>
    <div class="dati chiari">
      <div class="dato"><b>${C.numero(u.km)} km</b><span>distanza</span></div>
      <div class="dato"><b>+${C.numero(u.dislivello)} m</b><span>dislivello</span></div>
      <div class="dato"><b>${esc(u.dettagli.difficolta)}</b><span>difficoltà</span></div>
    </div>
    <div class="riga"><span><b class="prezzo">${C.euro(u.prezzo)}</b> a persona</span><b class="posti">${liberi > 0 ? liberi + " posti liberi" : "Al completo: lista d'attesa"}</b></div>
    <p class="nota"><b>Organizza:</b> ${esc(S.leader.nome)}, P. IVA ${esc(S.leader.piva)}<br><b>Annullamento:</b> ${esc(u.condizioni)}</p>
    <form class="box modulo" data-form="richiesta" data-id="${u.id}">
      <span class="eti">Chiedi un posto</span>
      <label for="rq-nome">Nome e iniziale del cognome</label>
      <input id="rq-nome" name="nome" required maxlength="40" autocomplete="off" placeholder="Es. Laura V.">
      <label for="rq-nota">Una nota per ${esc(S.leader.nome.split(" ")[0])} (facoltativa)</label>
      <input id="rq-nota" name="nota" maxlength="120" autocomplete="off">
      <label class="spunta"><input type="checkbox" name="foto"> Facoltativo: acconsento a comparire nelle foto dell'uscita</label>
      <p class="nota">Il nome serve a ${esc(S.leader.nome)}, titolare del trattamento, per organizzare l'uscita. Informativa privacy completa: link del leader (esempio nella demo).</p>
      <button class="btn primario" type="submit">${liberi > 0 ? "Chiedi un posto" : "Mettiti in lista d'attesa"}</button>
      <p class="nota">Non è un pagamento: ${esc(S.leader.nome.split(" ")[0])} ti conferma il posto su WhatsApp.</p>
    </form>
    <div class="powered centrato"><img src="icone/icon-192.png" alt="">Powered by Gruvia</div>
  </div>`;
};

function moduloUscita(u) {
  const v = u || { titolo: "", descrittore: "trekking", data: prossimoGiorno(6, 3), oraPartenza: "09:00", ritrovo: { nome: "", lat: 43.1, lon: 12.4 }, km: "", dislivello: "", attivita: "trekking", lingua: "it", dettagli: { difficolta: "E", quotaMax: "" }, prezzo: "", posti: 12, minimo: 6, condizioni: "", spese: [] };
  return `${indietro(u ? `#uscita/${u.id}` : "#uscite", u ? u.titolo : "Uscite")}
    <h1>${u ? "Modifica uscita" : "Nuova uscita"}</h1>
    <form class="box modulo" data-form="uscita" data-id="${u ? u.id : ""}" novalidate>
      <label for="f-gpx">Importa un file GPX (facoltativo)</label>
      <input id="f-gpx" type="file" data-azione="gpx">
      <p class="nota" id="esito-gpx">Distanza, dislivello e quote vengono calcolati dal file. Il file non viene salvato.</p>
      <label for="f-att">Attività *</label>
      <select id="f-att" name="attivita"><option value="trekking" selected>Trekking</option></select>
      <p class="nota">Ciclismo, sub, vela e viaggi arriveranno dopo: oggi è attivo solo il trekking. Difficoltà e quota stanno nel blocco del trekking.</p>
      <label for="f-titolo">Titolo *</label><input id="f-titolo" name="titolo" required maxlength="70" value="${esc(v.titolo)}">
      <label for="f-desc">Descrittore dell'attività</label><input id="f-desc" name="descrittore" maxlength="60" value="${esc(v.descrittore)}">
      <div class="due"><div><label for="f-data">Data *</label><input id="f-data" name="data" type="date" required value="${esc(v.data)}"></div>
        <div><label for="f-ora">Partenza *</label><input id="f-ora" name="oraPartenza" type="time" required value="${esc(v.oraPartenza)}"></div></div>
      <label for="f-ritrovo">Ritrovo *</label><input id="f-ritrovo" name="ritrovo" required maxlength="80" value="${esc(v.ritrovo.nome)}">
      <div class="tre"><div><label for="f-km">Km *</label><input id="f-km" name="km" type="number" step="0.1" min="0.1" max="80" required value="${esc(v.km)}"></div>
        <div><label for="f-dis">Dislivello m *</label><input id="f-dis" name="dislivello" type="number" min="0" max="5000" required value="${esc(v.dislivello)}"></div>
        <div><label for="f-quota">Quota max m</label><input id="f-quota" name="quotaMax" type="number" min="0" max="4810" value="${esc(v.dettagli.quotaMax)}"></div></div>
      <div class="tre"><div><label for="f-diff">Difficoltà *</label><select id="f-diff" name="difficolta">${["T", "E", "EE", "EEA"].map((d) => `<option ${d === v.dettagli.difficolta ? "selected" : ""}>${d}</option>`).join("")}</select></div>
        <div><label for="f-prezzo">Prezzo € *</label><input id="f-prezzo" name="prezzo" type="number" min="0" max="2000" required value="${esc(v.prezzo)}"></div>
        <div><label for="f-posti">Posti *</label><input id="f-posti" name="posti" type="number" min="1" max="60" required value="${esc(v.posti)}"></div></div>
      <label for="f-cond">Condizioni di annullamento *</label><textarea id="f-cond" name="condizioni" required maxlength="400" rows="3">${esc(v.condizioni)}</textarea>
      <label for="f-spese">Spese previste, una per riga (es. Assicurazione 48)</label>
      <textarea id="f-spese" name="spese" rows="3" maxlength="600">${esc(v.spese.map((s) => `${s.voce} ${s.importo}`).join("\n"))}</textarea>
      <input type="hidden" name="lat" value="${esc(v.ritrovo.lat)}"><input type="hidden" name="lon" value="${esc(v.ritrovo.lon)}">
      <p class="testo-errore" id="errori-modulo" hidden></p>
      <button class="btn primario" type="submit">${u ? "Salva le modifiche" : "Salva come bozza"}</button>
      <p class="nota">Senza titolo, data, ritrovo, prezzo, posti, difficoltà e condizioni di annullamento l'uscita non si può pubblicare.</p>
    </form>`;
}
V.nuova = () => moduloUscita(null);
V.modifica = (id) => (uscita(id) ? moduloUscita(uscita(id)) : nonTrovata());

V.profilo = () => {
  const L = S.leader;
  return `${intestazioneLeader()}
    <h1>${esc(t("titolo_profilo"))}</h1>
    <section class="box">
      <span class="eti">Titoli e zone</span>
      <p><b>${esc(L.titolo)}</b> <span class="chip c-info">dichiarato dal leader</span></p>
      <p class="nota">Zone: ${esc(L.zone)}. Gruvia ricorda i titoli, non li certifica.</p>
    </section>
    <section class="box">
      <span class="eti">Scadenzario</span>
      ${L.scadenze.map((s) => { const g = giorniA(s.data); return `<div class="riga"><span>${esc(s.voce)}</span><span class="chip ${g < 30 ? "c-attenzione" : "c-ok"}">${new Date(s.data + "T12:00").toLocaleDateString("it-IT")} · tra ${g} giorni</span></div>`; }).join("")}
    </section>
    <section class="box">
      <span class="eti">La tua pagina pubblica</span>
      <p class="nota">Marchio in primo piano, "Powered by Gruvia" in piccolo, nessun tracciamento di terze parti.</p>
      <a class="btn secondario" href="#leader">Vedi la tua pagina pubblica</a>
    </section>
    <section class="box">
      <span class="eti">Account</span>
      <div class="riga"><span>${esc(S.account?.email || "")}</span><span class="chip c-ok">email verificata</span></div>
      <p class="nota">Sessione valida fino al ${S.account ? esc(new Date(S.account.sessioneScade).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })) : "—"}. Dopo si rientra con un nuovo link.</p>
      <div class="riga"><button class="btn secondario" data-azione="esci">Esci</button><button class="btn secondario testo-errore" data-azione="elimina-account">Elimina l'account</button></div>
    </section>
    <section class="box">
      <span class="eti">Privacy e dati</span>
      <p class="nota">Informativa per i partecipanti: versione ${esc(VERSIONE_INFORMATIVA)}. Ogni consenso si registra con data, ora e versione.</p>
      <p class="nota">I dati dei partecipanti si cancellano da soli ${CONSERVAZIONE_GIORNI} giorni dopo ogni uscita.</p>
      <button class="btn secondario" data-azione="esporta-tutto">Esporta tutti i miei dati (JSON)</button>
    </section>
    <section class="box">
      <span class="eti">Uso dell'app (anonimo)</span>
      ${(() => { const ev = S.eventi, tc = ev.tempiCreazione; const medio = tc.length ? Math.round(tc.reduce((a, b) => a + b, 0) / tc.length) : null;
        return `<div class="dati"><div class="dato"><b>${ev.usciteCreate}</b><span>uscite create</span></div>
          <div class="dato"><b>${medio === null ? "—" : Math.floor(medio / 60) + "′ " + (medio % 60) + "″"}</b><span>tempo medio di creazione</span></div>
          <div class="dato"><b>${ev.richiesteRicevute}</b><span>richieste ricevute</span></div>
          <div class="dato"><b>${ev.messaggiCopiati}</b><span>messaggi copiati</span></div>
          <div class="dato"><b>${ev.accessi}</b><span>accessi</span></div></div>`; })()}
      <p class="nota">Si contano solo eventi, senza nomi né dati personali. Servono a misurare se l'app fa risparmiare tempo.</p>
    </section>
    <section class="box">
      <label class="eti" for="lingua">${esc(t("lingua"))}</label>
      <select id="lingua" data-azione="lingua" class="selettore"><option value="it" ${LINGUA === "it" ? "selected" : ""}>Italiano</option><option value="en" ${LINGUA === "en" ? "selected" : ""}>English (in preparazione)</option></select>
      <p class="nota">Ogni uscita ha anche il campo lingua: oggi tutte in italiano.</p>
    </section>
    <section class="box">
      <span class="eti">Dati della demo</span>
      <p class="nota">Tutto ciò che vedi è di esempio e resta solo in questo browser. Nessun dato viene inviato a un server.</p>
      <button class="btn secondario" data-azione="ripristina">Ripristina i dati di esempio</button>
    </section>
    <p class="nota centrato">Gruvia · demo Fase 1A · versione 0.2</p>`;
};

function nonTrovata() {
  return `<h1>Uscita non trovata</h1><p>Forse è stata cancellata o hai ripristinato i dati di esempio.</p><a class="btn secondario" href="#uscite">Torna alle uscite</a>`;
}

// F105: accesso del leader con link via email, senza password. Nella demo l'email è simulata.
let attesaLink = null;
V.accesso = () => attesaLink
  ? `<div class="accesso"><img src="icone/icon-192.png" alt="" class="logo-accesso">
      <h1>Controlla la tua email</h1>
      <p>Abbiamo mandato un link di accesso a <b>${esc(attesaLink.email)}</b>. Vale 15 minuti e una sola volta.</p>
      <section class="box"><span class="eti">Email simulata della demo</span>
        <p>"Ciao, tocca il pulsante per entrare in Gruvia."</p>
        <button class="btn primario" data-azione="apri-link">Apri il link di accesso</button></section>
      <button class="btn secondario" data-azione="cambia-email">Usa un'altra email</button></div>`
  : `<div class="accesso"><img src="icone/icon-192.png" alt="" class="logo-accesso">
      <h1>${esc(t("titolo_accesso"))}</h1>
      <p>${esc(t("accesso_testo"))}</p>
      <form class="box modulo" data-form="accesso">
        <label for="acc-email">${esc(t("accesso_email"))}</label>
        <input id="acc-email" name="email" type="email" required maxlength="120" autocomplete="email" placeholder="nome@esempio.it">
        <button class="btn primario" type="submit">${esc(t("accesso_invia"))}</button>
      </form>
      <button class="btn secondario" disabled title="Non attivo nella demo">Continua con Google (non attivo nella demo)</button>
      <p class="nota">Demo: nessuna email viene inviata davvero. Nell'app vera l'accesso lo gestisce il servizio scelto in T04, e un leader non vede mai le uscite di un altro.</p></div>`;

// F20: pagina pubblica minima del leader.
V.leader = () => {
  const L = S.leader;
  const pubblicate = S.uscite.filter((u) => ["pubblicata"].includes(u.stato) && giorniA(u.data) >= 0).sort((a, b) => a.data.localeCompare(b.data));
  const archivio = S.uscite.filter((u) => u.stato === "conclusa" || (u.stato !== "bozza" && giorniA(u.data) < 0));
  return `<div class="pubblica">
    <a class="indietro" href="#profilo">‹ Torna all'app del leader</a>
    <div class="leader grande-leader"><div class="avatar">${esc(L.marchio.split(" ").map((p) => p[0]).filter((c) => /[A-Z]/.test(c)).slice(0, 2).join(""))}</div>
      <div><strong>${esc(L.marchio)}</strong><span class="nota">${esc(L.titolo)} (dichiarato dal leader) · ${esc(L.zone)}</span></div></div>
    <section class="box"><span class="eti">Prossime uscite</span>
      ${pubblicate.length ? pubblicate.map((u) => `<a class="riga link-uscita" href="#pubblica/${u.id}"><span><b>${esc(u.titolo)}</b><br><span class="nota">${esc(dataBreve(u.data))} · ${C.numero(u.km)} km · ${C.euro(u.prezzo)}</span></span>${chipStato(statoEff(u))}</a>`).join("") : `<p class="nota">Nessuna uscita in programma.</p>`}
    </section>
    <section class="box"><span class="eti">Uscite fatte</span>
      ${archivio.length ? archivio.map((u) => `<div class="riga"><span>${esc(u.titolo)}</span><span class="nota">${esc(new Date(u.data + "T12:00").toLocaleDateString("it-IT", { month: "long", year: "numeric" }))}</span></div>`).join("") : `<p class="nota">Ancora nessuna.</p>`}
    </section>
    <section class="box"><span class="eti">Contatto</span><p>${esc(L.contatto)}</p></section>
    <div class="powered centrato"><img src="icone/icon-192.png" alt="">Powered by Gruvia</div>
  </div>`;
};

// F26: pagina personale del partecipante, aperta dal suo link. Nessun account, nessun dato di altre persone.
V.p = (codice) => {
  let u = null, p = null;
  for (const x of S.uscite) { const y = x.partecipanti.find((q) => q.link && q.link.codice === codice); if (y) { u = x; p = y; break; } }
  if (!p) return `<div class="pubblica"><h1>Link non valido</h1><p>Il link non esiste o è stato revocato. Chiedi un nuovo link a chi organizza l'uscita.</p></div>`;
  if (Date.now() > p.link.scade) return `<div class="pubblica"><h1>Link scaduto</h1><p>Questo link valeva fino al giorno dopo l'uscita. Per un'altra uscita chiedi un nuovo link.</p></div>`;
  return `<div class="pubblica">
    <a class="indietro" href="#partecipanti/${u.id}">‹ Torna all'app del leader (solo nella demo)</a>
    <p class="eti">Ciao ${esc(p.nome.split(" ")[0])}</p>
    <h1>${esc(u.titolo)}</h1>
    <p><b>${esc(dataLunga(u.data))}</b> · ritrovo ${esc(u.oraPartenza)} a ${esc(u.ritrovo.nome)}</p>
    <section class="box"><span class="eti">Il tuo posto</span>
      <p>${p.stato === "confermato" ? "✅ Posto confermato." : p.stato === "richiesta" ? "In attesa di conferma da " + esc(S.leader.nome.split(" ")[0]) + "." : "Sei in lista d'attesa."}</p></section>
    <section class="box"><span class="eti">Checklist dell'attrezzatura</span>
      <ul class="lista-check"><li>Scarponi da escursionismo</li><li>Giacca impermeabile e uno strato caldo</li><li>1,5 litri d'acqua e pranzo al sacco</li><li>Documento e tessera sanitaria</li></ul>
      ${p.checklist ? `<p class="testo-ok">Hai confermato di aver visto la checklist.</p>` : `<button class="btn primario" data-azione="p-checklist" data-codice="${esc(codice)}">Ho visto la checklist</button>`}
    </section>
    <button class="btn secondario testo-errore" data-azione="p-disdici" data-codice="${esc(codice)}">Non posso più venire</button>
    <p class="nota">Questo link è solo tuo: non inoltrarlo. Scade il ${esc(new Date(p.link.scade).toLocaleDateString("it-IT"))}.</p>
    <div class="powered centrato"><img src="icone/icon-192.png" alt="">Powered by Gruvia</div>
  </div>`;
};

// ---------- navigazione ----------
const PUBBLICHE = ["pubblica", "leader", "p"];
function mostra() {
  let [sez, id] = (location.hash.slice(1) || "oggi").split("/");
  if (!PUBBLICHE.includes(sez) && !sessioneValida()) sez = "accesso";
  if (sez === "nuova") window._inizioCreazione = Date.now();
  const vista = V[sez] || V.oggi;
  const app = document.getElementById("app");
  app.innerHTML = vista(id);
  const sezNav = { oggi: "oggi", profilo: "profilo", assistente: "oggi", benvenuto: "profilo" }[sez] || "uscite";
  document.querySelectorAll("#nav a").forEach((a) => a.setAttribute("aria-current", a.dataset.sez === sezNav ? "page" : "false"));
  document.querySelectorAll("[data-t]").forEach((el) => { el.textContent = t(el.dataset.t); });
  document.documentElement.lang = LINGUA;
  document.getElementById("nav").hidden = PUBBLICHE.includes(sez) || sez === "accesso" || sez === "benvenuto";
  document.body.classList.toggle("modo-sentiero", sez === "sentiero");
  window.scrollTo(0, 0);
}

// ---------- azioni ----------
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-azione]");
  if (!el || el.tagName === "INPUT") return;
  const u = el.dataset.id ? uscita(el.dataset.id) : null;
  const p = u && el.dataset.p ? u.partecipanti.find((x) => x.id === Number(el.dataset.p)) : null;
  switch (el.dataset.azione) {
    case "filtro": filtroUscite = el.dataset.valore; break;
    case "tipo-msg": tipoMessaggio = el.dataset.valore; break;
    case "copia-msg": S.eventi.messaggiCopiati++; salva(); copia(messaggiDi(u)[tipoMessaggio], "Testo copiato: incollalo nel gruppo WhatsApp"); return;
    case "copia-promemoria": {
      const nomi = conti(u).senzaChecklist.map((x) => x.nome.split(" ")[0]).join(", ");
      S.eventi.messaggiCopiati++; salva();
      copia(`${nomi}: ricordatevi di confermare la checklist per ${u.titolo} dal vostro link. Grazie!`, "Promemoria copiato");
      return;
    }
    case "link-p": {
      // Il link scade il giorno dopo l'uscita; un nuovo link revoca il precedente.
      const fine = new Date(u.data + "T23:59"); fine.setDate(fine.getDate() + 1);
      p.link = { codice: codiceCasuale(), scade: fine.getTime() };
      salva();
      copia(`${location.origin}${location.pathname}#p/${p.link.codice}`, `Link personale di ${p.nome} copiato`);
      return;
    }
    case "esporta-p":
      scarica(`partecipante-${p.id}.json`, { esportato: new Date().toISOString(), uscita: u.titolo, data: u.data, partecipante: p });
      avviso("Dati della persona esportati"); return;
    case "esporta-tutto":
      scarica("campo-base-miei-dati.json", { esportato: new Date().toISOString(), leader: S.leader, uscite: S.uscite });
      avviso("Esportazione completata"); return;
    case "annulla":
      if (el.dataset.conferma !== "si") { el.dataset.conferma = "si"; el.textContent = "Tocca di nuovo per annullare"; return; }
      u.stato = "annullata"; avviso("Uscita annullata: avvisa i partecipanti su WhatsApp"); break;
    case "esci": S.account.sessioneScade = 0; salva(); location.hash = "#oggi"; mostra(); avviso("Sei uscito"); return;
    case "elimina-account":
      if (el.dataset.conferma !== "si") { el.dataset.conferma = "si"; el.textContent = "Tocca di nuovo: cancella tutto"; return; }
      try { localStorage.removeItem(CHIAVE); } catch (err) { /* niente da cancellare */ }
      S = datiDemo(); S.account = null; S.eventi = { accessi: 0, usciteCreate: 0, tempiCreazione: [], messaggiCopiati: 0, richiesteRicevute: 0 };
      salva(); location.hash = "#oggi"; mostra(); avviso("Account e dati eliminati"); return;
    case "apri-link":
      S.account = { email: attesaLink.email, dal: new Date().toISOString(), sessioneScade: Date.now() + DURATA_SESSIONE_GIORNI * 86400000 };
      S.eventi.accessi++; attesaLink = null; salva(); location.hash = S.leader.configurato ? "#oggi" : "#benvenuto"; mostra(); avviso("Accesso eseguito"); return;
    case "cambia-email": attesaLink = null; mostra(); return;
    case "p-checklist": case "p-disdici": {
      let uu = null, pp = null;
      for (const x of S.uscite) { const y = x.partecipanti.find((q) => q.link && q.link.codice === el.dataset.codice); if (y) { uu = x; pp = y; } }
      if (!pp || Date.now() > pp.link.scade) { mostra(); return; }
      if (el.dataset.azione === "p-checklist") { pp.checklist = true; avviso("Grazie: il leader vede che hai letto la checklist"); }
      else {
        if (el.dataset.conferma !== "si") { el.dataset.conferma = "si"; el.textContent = "Tocca di nuovo per confermare la disdetta"; return; }
        uu.partecipanti = uu.partecipanti.filter((q) => q !== pp); delete uu.presenze[pp.id];
        salva(); location.hash = "#leader"; avviso("Disdetta registrata: il posto torna libero"); return;
      }
      break;
    }
    case "conferma":
      if (conti(u).confermati >= u.posti) { avviso("Posti esauriti: aumenta i posti dalla scheda per confermare."); return; }
      p.stato = "confermato"; avviso(`${p.nome} confermato`); break;
    case "checklist": p.checklist = true; break;
    case "cancella":
      if (el.dataset.conferma !== "si") { el.dataset.conferma = "si"; el.textContent = "Sicuro?"; el.classList.add("pericolo"); return; }
      u.partecipanti = u.partecipanti.filter((x) => x !== p); delete u.presenze[p.id]; avviso("Persona cancellata da questa uscita"); break;
    case "presenza": u.presenze[p.id] = !u.presenze[p.id]; break;
    case "convalida": { const s = u.spunti.find((x) => x.id === Number(el.dataset.spunto)); s.stato = "convalidato"; s.fonte = "Conoscenza diretta del leader"; break; }
    case "scarta": u.spunti = u.spunti.filter((x) => x.id !== Number(el.dataset.spunto)); break;
    case "pubblica": {
      const manca = ["titolo", "data", "prezzo", "posti", "condizioni"].filter((c) => !u[c] && u[c] !== 0);
      if (!u.dettagli?.difficolta) manca.push("difficolta");
      if (manca.length || !u.ritrovo.nome) { avviso("Mancano dati obbligatori: completa la scheda prima di pubblicare."); return; }
      u.stato = "pubblicata"; avviso("Uscita pubblicata"); break;
    }
    case "concludi": u.stato = "conclusa"; avviso("Uscita spostata in archivio"); break;
    case "duplica": {
      const copiaU = JSON.parse(JSON.stringify(u));
      Object.assign(copiaU, { id: nuovoId(), stato: "bozza", data: prossimoGiorno(6, 3), partecipanti: [], presenze: {}, consultazioni: [] });
      S.uscite.push(copiaU); salva(); location.hash = `#modifica/${copiaU.id}`; avviso("Bozza creata dall'archivio"); return;
    }
    case "ripristina": { const acc = S.account, ev = S.eventi; S = datiDemo(); S.account = acc; S.eventi = ev; avviso("Dati di esempio ripristinati"); break; }
    default: return;
  }
  salva(); mostra();
});

document.addEventListener("submit", (e) => {
  const f = e.target;
  e.preventDefault();
  const dati = Object.fromEntries(new FormData(f));
  const u = f.dataset.id ? uscita(f.dataset.id) : null;

  if (f.dataset.form === "accesso") {
    const email = dati.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { avviso("Controlla l'email: sembra incompleta."); return; }
    attesaLink = { email, scade: Date.now() + 15 * 60000 };
    mostra(); return;
  }

  if (f.dataset.form === "consultazione") {
    u.consultazioni.push({ servizio: "Aeronautica Militare", quando: new Date().toISOString(), nota: dati.nota.trim().slice(0, 120) });
    salva(); mostra(); avviso("Consultazione registrata"); return;
  }

  if (f.dataset.form === "richiesta") {
    const nome = dati.nome.trim().slice(0, 40);
    if (!nome) { avviso("Scrivi il tuo nome per chiedere il posto."); return; }
    // Una seconda richiesta con lo stesso nome viene unita alla prima (F26).
    if (u.partecipanti.some((p) => p.nome.toLowerCase() === nome.toLowerCase())) { avviso("Hai già chiesto un posto per questa uscita."); return; }
    const pieno = conti(u).confermati >= u.posti;
    // F24: ogni consenso con data, ora e versione dell'informativa; il consenso foto è facoltativo e separato.
    const consensi = [{ tipo: "foto", valore: !!dati.foto, quando: new Date().toISOString(), versione: VERSIONE_INFORMATIVA }];
    u.partecipanti.push({ id: nuovoId(), nome, stato: pieno ? "lista" : "richiesta", checklist: false, nota: dati.nota.trim().slice(0, 120), consensi });
    S.eventi.richiesteRicevute++;
    salva(); f.reset();
    avviso(pieno ? "Sei in lista d'attesa: riceverai un messaggio se si libera un posto" : `Richiesta inviata a ${S.leader.nome.split(" ")[0]}: ti conferma su WhatsApp`);
    return;
  }

  if (f.dataset.form === "uscita") {
    const num = (v) => (v === "" || v == null ? NaN : Number(v));
    const errori = [];
    if (!dati.titolo.trim()) errori.push("titolo");
    if (!dati.data) errori.push("data");
    if (!dati.ritrovo.trim()) errori.push("ritrovo");
    if (!(num(dati.km) > 0)) errori.push("km");
    if (!(num(dati.dislivello) >= 0)) errori.push("dislivello");
    if (!(num(dati.prezzo) >= 0)) errori.push("prezzo");
    if (!(num(dati.posti) >= 1)) errori.push("posti");
    if (!dati.condizioni.trim()) errori.push("condizioni di annullamento");
    const box = document.getElementById("errori-modulo");
    if (errori.length) { box.hidden = false; box.textContent = `Completa questi campi: ${errori.join(", ")}.`; box.scrollIntoView({ block: "center" }); return; }
    const spese = dati.spese.split("\n").map((r) => r.trim()).filter(Boolean).map((r) => {
      const m = r.match(/^(.*?)[\s:]+(\d+(?:[.,]\d+)?)\s*€?$/);
      return m ? { voce: m[1].slice(0, 60), importo: Number(m[2].replace(",", ".")) } : { voce: r.slice(0, 60), importo: 0 };
    });
    const valori = {
      titolo: dati.titolo.trim(), descrittore: dati.descrittore.trim(), data: dati.data, oraPartenza: dati.oraPartenza,
      ritrovo: { nome: dati.ritrovo.trim(), lat: Number(dati.lat) || 43.1, lon: Number(dati.lon) || 12.4 },
      km: num(dati.km), dislivello: num(dati.dislivello), attivita: "trekking", lingua: "it", dettagli: { difficolta: dati.difficolta, quotaMax: num(dati.quotaMax) || null },
      prezzo: num(dati.prezzo), posti: num(dati.posti), condizioni: dati.condizioni.trim(), spese,
    };
    let id;
    if (u) { Object.assign(u, valori); id = u.id; }
    else {
      // F30: si misura solo quanti secondi servono a creare un'uscita, senza dati personali.
      S.eventi.usciteCreate++;
      if (window._inizioCreazione) S.eventi.tempiCreazione.push(Math.round((Date.now() - window._inizioCreazione) / 1000));
      id = nuovoId(); S.uscite.push({ id, ...valori, minimo: 0, stato: "bozza", consultazioni: [], presenze: {}, spunti: [], partecipanti: [] }); }
    salva(); location.hash = `#uscita/${id}`; avviso(u ? "Modifiche salvate" : "Bozza salvata");
  }
});

document.addEventListener("change", async (e) => {
  if (e.target.dataset.azione === "lingua") {
    S.lingua = LINGUA = e.target.value; salva(); mostra();
    if (LINGUA === "en") avviso("English: only navigation and main titles are translated in this demo.");
    return;
  }
  if (e.target.dataset.azione !== "gpx") return;
  const file = e.target.files[0];
  const esito = document.getElementById("esito-gpx");
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { esito.textContent = "Il file supera 5 MB: esporta una traccia più leggera."; esito.className = "testo-errore"; return; }
  try {
    const r = C.analizzaGPX(await file.text());
    const f = e.target.form;
    f.km.value = r.km; f.dislivello.value = r.dislivello; if (r.quotaMax) f.quotaMax.value = r.quotaMax;
    f.lat.value = r.partenza.lat; f.lon.value = r.partenza.lon;
    esito.className = "nota testo-ok";
    esito.textContent = `Letto: ${C.numero(r.km)} km, +${r.dislivello} m, quota max ${r.quotaMax ?? "—"} m (${r.punti} punti). Controlla i valori.`;
  } catch (err) {
    esito.className = "testo-errore"; esito.textContent = err.message;
  }
});

function aggiornaRete() {
  const el = document.getElementById("stato-rete");
  if (el) el.textContent = navigator.onLine ? "● In linea" : "◌ Senza rete: l'app funziona lo stesso";
}
window.addEventListener("online", aggiornaRete);
window.addEventListener("offline", aggiornaRete);
window.addEventListener("hashchange", mostra);

// Avvio dopo il caricamento di tutti gli script (anche assistente.js aggiunge schermate).
window.addEventListener("DOMContentLoaded", () => { carica(); mostra(); });
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  // Quando arriva una versione nuova dell'app, la pagina si ricarica una volta da sola.
  let ricaricata = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!ricaricata) { ricaricata = true; location.reload(); } });
}
