"use strict";
// Modulo "organizzazione dell'uscita", lato leader (Fase 1B e 1C).
// F03 briefing ridotto · F13 soste con spunti · F44 spunti con convalida · F70 tappe e timeline
// F66 attività extra · F68 azioni rapide in Oggi · F16 promemoria al leader · F83 modello dei link · F89 zaino consigliato.
// Nessuna AI esterna: la lista equipaggiamento è una bozza a regole, etichettata "Automatico". Nessuna scheda rischi.

const ModuloUscita = (() => {
  // ---------- regole pure (provabili con node) ----------
  const MAX_SPUNTI = 12;
  const FONTE_DIRETTA = "Conoscenza diretta del leader";
  const GIORNI_VERIFICA_LINK = 180;

  // F44: numeri, anni e secoli senza una fonte scritta vanno segnalati.
  const haNumeri = (testo) => /\d/.test(testo || "") || /\b([IVXL]+\s+secolo|secolo\s+[IVXL]+)\b/i.test(testo || "");
  const fonteValida = (fonte) => String(fonte || "").trim().length >= 3;
  const fonteDiretta = (fonte) => String(fonte || "").trim() === FONTE_DIRETTA;
  // "numero senza fonte": il testo ha cifre o datazioni e non c'è fonte, oppure c'è solo la conoscenza diretta.
  const numeroSenzaFonte = (s) => haNumeri(s.testo) && (!fonteValida(s.fonte) || fonteDiretta(s.fonte));

  // F66: quota per aderente. "persona" = costo a testa; "totale" = costo da dividere fra gli aderenti.
  function quotaExtra(x) {
    const n = (x.aderenti || []).length;
    if (x.modo === "persona") return Number(x.costo) || 0;
    return n ? Math.round(((Number(x.costo) || 0) / n) * 100) / 100 : null;
  }
  function totalePerPartecipante(extra, pid) {
    return extra.filter((x) => (x.aderenti || []).includes(pid)).reduce((s, x) => s + (quotaExtra(x) || 0), 0);
  }

  // F16: momenti dei promemoria, in giorni rispetto all'uscita (48 h ≈ 2 giorni, 24 h = 1 giorno).
  const MOMENTI = [
    { chiave: "annuncio", offset: -7, quando: "7 giorni prima", titolo: "Pubblica l'annuncio", fino: 0 },
    { chiave: "conferme", offset: -2, quando: "48 ore prima", titolo: "Chiudi le conferme", fino: 0 },
    { chiave: "giorno", offset: -1, quando: "24 ore prima", titolo: "Prepara il messaggio del giorno", fino: 0 },
    { chiave: "dopo", offset: 1, quando: "Il giorno dopo", titolo: "Messaggio post-uscita", fino: 7 },
  ];
  // g = giorni da oggi all'uscita (giorniA). Ritorna "futuro", "ora", "passato" (finestra chiusa).
  function statoMomento(m, g) {
    const rel = -g; // giorni trascorsi dall'uscita (negativo prima)
    if (rel < m.offset) return "futuro";
    if (rel > m.fino) return "passato";
    return "ora";
  }

  // F70: segnala le tappe fuori ordine di giorno.
  function tappeFuoriOrdine(tappe) {
    const out = [];
    for (let i = 1; i < tappe.length; i++) if (Number(tappe[i].giorno) < Number(tappe[i - 1].giorno)) out.push(tappe[i].id);
    return out;
  }
  function sposta(arr, i, dir) {
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return false;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return true;
  }

  // F68: sondaggio con 2-4 opzioni.
  function opzioniValide(lista) {
    const o = lista.map((x) => String(x || "").trim()).filter(Boolean);
    return o.length >= 2 && o.length <= 4 ? o : null;
  }
  const testoSondaggio = (titolo, s) => `Sondaggio · ${titolo}\n${s.domanda}\n\n${s.opzioni.map((o, i) => `${i + 1}) ${o}`).join("\n")}\n\nRispondete con il numero dell'opzione.`;

  // F83: link dello zaino. Solo https; in Fase 1 si mostrano solo i link neutri.
  const urlValido = (url) => /^https:\/\/[^\s<>"']+\.[^\s<>"']+$/i.test(String(url || "").trim());
  const linkVisibile = (l) => !!l && l.tipo === "neutro" && urlValido(l.url);
  const linkDaRiverificare = (l, oggiMs = Date.now()) => !l.verificato || (oggiMs - new Date(l.verificato + "T12:00").getTime()) / 86400000 > GIORNI_VERIFICA_LINK;

  // F03: lista equipaggiamento a regole (bozza, il leader decide). Nessuna indicazione di sicurezza, nessuna previsione.
  function equipaggiamento({ ore, durataTesto, mese, quotaMax, minutiMargineTramonto, notaMeteo }) {
    const voci = [
      ["Scarponi da escursionismo", "sempre"],
      ["Giacca impermeabile", "sempre"],
      [`Acqua per tutta la durata (circa ${durataTesto || Math.round(ore * 10) / 10 + " h"})`, "dalla durata stimata"],
      ["Documento e tessera sanitaria", "sempre"],
    ];
    if (ore >= 4) voci.push(["Pranzo al sacco e qualcosa per le pause", "durata di 4 ore o più"]);
    if ((quotaMax || 0) >= 1200 || [9, 10, 11, 0, 1, 2, 3].includes(mese)) voci.push(["Uno strato caldo in più", (quotaMax || 0) >= 1200 ? "quota massima sopra 1200 m" : "stagione"]);
    if ([11, 0, 1, 2].includes(mese)) voci.push(["Guanti e berretto", "stagione"]);
    if ([5, 6, 7, 8].includes(mese)) voci.push(["Cappello e crema solare", "stagione"]);
    if (minutiMargineTramonto !== null && minutiMargineTramonto < 60) voci.push(["Lampada frontale", "rientro stimato vicino al tramonto"]);
    if (/piogg|temporal|acquazz/i.test(notaMeteo || "")) voci.push(["Copri-zaino", "dalla tua nota sulla consultazione meteo"]);
    return voci.map(([testo, motivo]) => ({ testo, motivo }));
  }

  const regole = { MAX_SPUNTI, FONTE_DIRETTA, haNumeri, fonteValida, numeroSenzaFonte, quotaExtra, totalePerPartecipante, MOMENTI, statoMomento, tappeFuoriOrdine, sposta, opzioniValide, testoSondaggio, urlValido, linkVisibile, linkDaRiverificare, equipaggiamento };
  if (typeof V === "undefined") return regole; // caricato da node per le prove

  // ---------- dati, inizializzati quando servono ----------
  function dati(u) {
    u.spunti ??= []; u.soste ??= []; u.tappe ??= []; u.extra ??= []; u.sondaggi ??= [];
    u.promemoriaFatti ??= {};
    u.zaino ??= { voci: [], approvato: null };
    return u;
  }
  function zainoGenerale() {
    S.leader.zaino ??= { voci: ["Scarponi da escursionismo", "Giacca impermeabile e uno strato caldo", "1,5 litri d'acqua e pranzo al sacco", "Documento e tessera sanitaria"].map((testo) => ({ id: nuovoId(), testo, link: null })), approvato: null };
    return S.leader.zaino;
  }
  const nomeLeader = () => (S.leader.nome || "").split(" ")[0];
  const confermati = (u) => u.partecipanti.filter((p) => p.stato === "confermato");
  const quandoBreve = (iso) => new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
  const dataPiu = (iso, giorni) => { const d = new Date(iso + "T12:00"); d.setDate(d.getDate() + giorni); return d; };
  const oggiIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const testa = (u, titolo) => `${indietro(`#uscita/${u.id}`, u.titolo)}<h1>${esc(titolo)}</h1>`;
  function ridisegna() { const y = window.scrollY; salva(); mostra(); window.scrollTo(0, y); }
  function trovaPerCodice(codice) {
    for (const x of S.uscite) { const y = x.partecipanti.find((q) => q.link && q.link.codice === codice); if (y) return { u: x, p: y }; }
    return null;
  }

  // ---------- F03 briefing ----------
  function vociBriefing(u) {
    const b = briefing(u);
    const ultima = u.consultazioni[u.consultazioni.length - 1];
    return equipaggiamento({
      ore: b.ore, durataTesto: C.durata(b.ore), mese: new Date(u.data + "T12:00").getMonth(), quotaMax: u.dettagli?.quotaMax,
      minutiMargineTramonto: b.tram ? Math.round((b.tram - b.rientro) / 60000) : null, notaMeteo: ultima?.nota,
    });
  }
  V.briefing = (id) => {
    const u = uscita(id);
    if (!u) return nonTrovata();
    dati(u);
    const b = briefing(u);
    const meteo = `https://www.meteoam.it/it/ricerca?query=${encodeURIComponent(u.ritrovo.nome)}`;
    const cons = [...u.consultazioni].reverse().slice(0, 5);
    const zg = zainoGenerale(), presenti = new Set([...zg.voci, ...u.zaino.voci].map((v) => v.testo.toLowerCase()));
    const auto = vociBriefing(u);
    return `${testa(u, "Briefing")}
    <section class="box">
      <div class="riga"><span class="eti">Orari</span><span class="nota">${esc(dataBreve(u.data))} · partenza ${esc(u.oraPartenza)}</span></div>
      <div class="dati">
        <div class="dato"><b>${C.ora(b.tram)}</b><span>tramonto</span></div>
        <div class="dato"><b>${C.durata(b.ore)}</b><span>durata stimata</span></div>
        <div class="dato"><b>${C.ora(b.limite)}</b><span>ora limite</span></div>
      </div>
      <p class="nota">Rientro stimato ${C.ora(b.rientro)}${b.inTempo ? ", entro l'ora limite." : `: <b class="testo-errore">oltre l'ora limite</b>, anticipa la partenza o accorcia il percorso.`} Durata da km e dislivello (km ÷ 4 + dislivello ÷ 400), da confermare.</p>
    </section>
    <section class="box">
      <div class="riga"><span class="eti">Lista equipaggiamento</span><a class="btn secondario piccolo" href="#zaino/${u.id}">Zaino</a></div>
      ${zg.approvato || u.zaino.approvato ? `<ul class="lista-check">${(zg.approvato ? zg.voci : []).concat(u.zaino.approvato ? u.zaino.voci : []).map((v) => `<li>${esc(v.testo)}</li>`).join("")}</ul>
        <p class="nota">Dallo zaino che hai approvato${u.zaino.approvato ? "" : " (solo quello generale: lo zaino di questa uscita non è ancora approvato)"}.</p>` : `<p class="nota">Nessuno zaino approvato: i partecipanti vedono la checklist di base.</p>`}
      <div class="riga"><span class="chip c-ai">✦ Automatico</span><span class="nota">bozza a regole</span></div>
      ${auto.map((v, i) => `<div class="riga"><span>${esc(v.testo)}<br><span class="nota">${esc(v.motivo)}</span></span>${presenti.has(v.testo.toLowerCase()) ? `<span class="chip c-ok">Nello zaino</span>` : `<button class="btn secondario piccolo" data-azione="us-br-aggiungi" data-id="${u.id}" data-i="${i}">Aggiungi</button>`}</div>`).join("")}
      <p class="nota">Bozza calcolata solo da durata, quota, data e dalle tue note sul meteo. Non è una valutazione dei rischi e non garantisce la sicurezza: decidi tu cosa chiedere. "Aggiungi" la mette nello zaino dell'uscita, che poi approvi.</p>
    </section>
    <section class="box">
      <span class="eti">Meteo</span>
      <div class="riga"><span>Aeronautica Militare</span><a class="btn secondario piccolo" href="${meteo}" target="_blank" rel="noopener noreferrer">Apri ↗</a></div>
      <p class="nota">Campo Base non fa previsioni: apri la fonte ufficiale e registra quando l'hai consultata.</p>
      ${cons.length ? cons.map((c) => `<div class="riga nota"><span>${esc(quandoBreve(c.quando))} · ${esc(c.servizio || "Meteo")}</span><span>${c.nota ? `“${esc(c.nota)}”` : ""}</span></div>`).join("") : `<p class="nota">Meteo non ancora consultato per questa uscita.</p>`}
      <form class="in-linea" data-form="consultazione" data-id="${u.id}">
        <label class="visuale-nascosta" for="br-nota-meteo">Nota sulla consultazione</label>
        <input id="br-nota-meteo" name="nota" maxlength="120" placeholder="Nota, es. pioggia debole sabato sera">
        <button class="btn secondario" type="submit">Registra</button>
      </form>
    </section>
    <p class="nota">Nessuna scheda rischi generata: valgono le tue procedure e il tuo giudizio. In emergenza 112.</p>
    <button class="btn primario" data-azione="us-br-copia" data-id="${u.id}">Copia il briefing per WhatsApp</button>`;
  };
  function testoBriefing(u) {
    const b = briefing(u), zg = zainoGenerale();
    const voci = (zg.approvato ? zg.voci : []).concat(u.zaino.approvato ? u.zaino.voci : []).map((v) => `- ${v.testo}`);
    return `Briefing · ${u.titolo}, ${dataLunga(u.data)}\nRitrovo ${u.oraPartenza} a ${u.ritrovo.nome}.\nDurata stimata ${C.durata(b.ore)}, tramonto ${C.ora(b.tram)}: rientriamo entro le ${C.ora(b.limite)}.${voci.length ? `\nNello zaino:\n${voci.join("\n")}` : ""}\n${nomeLeader()}`;
  }

  // ---------- F13 + F44 soste e spunti ----------
  function chipSpunto(s) {
    return `${s.ai ? `<span class="chip c-ai">✦ Proposto dall'AI</span>` : `<span class="chip c-info">Del leader</span>`}<span class="chip ${s.stato === "convalidato" ? "c-ok" : "c-attenzione"}">${s.stato === "convalidato" ? "Convalidato" : "Da convalidare"}</span>${numeroSenzaFonte(s) ? `<span class="chip c-errore">Numero senza fonte</span>` : ""}`;
  }
  function schedaSpunto(u, s) {
    const opz = `<option value="">Nessuna sosta</option>${u.soste.map((x) => `<option value="${x.id}" ${x.id === s.sostaId ? "selected" : ""}>${esc(x.nome)}</option>`).join("")}`;
    return `<div class="spunto">
      <div class="chips">${chipSpunto(s)}</div>
      <p>${esc(s.testo)}</p>
      ${s.fonte ? `<p class="nota">Fonte: ${esc(s.fonte)}</p>` : `<p class="nota">Senza fonte. Non è visibile ai partecipanti finché non lo convalidi.</p>`}
      ${numeroSenzaFonte(s) ? `<p class="nota testo-errore">Contiene numeri o datazioni ${fonteValida(s.fonte) ? "con la sola conoscenza diretta: meglio una fonte scritta" : "senza fonte: aggiungila prima di convalidare"}.</p>` : ""}
      <label class="visuale-nascosta" for="sp-sosta-${s.id}">Sosta dello spunto</label>
      <select id="sp-sosta-${s.id}" class="selettore" data-us-cambio="sp-sosta" data-id="${u.id}" data-spunto="${s.id}">${opz}</select>
      ${s.stato === "convalidato"
        ? `<div class="riga"><button class="btn secondario piccolo" data-azione="us-sp-riapri" data-id="${u.id}" data-spunto="${s.id}">Riapri</button><button class="btn secondario piccolo" data-azione="scarta" data-id="${u.id}" data-spunto="${s.id}">Scarta</button></div>`
        : `<form class="modulo" data-form="us-sp-convalida" data-id="${u.id}" data-spunto="${s.id}">
          <label for="sp-fonte-${s.id}">Fonte (libro, sito, ente, guida)</label>
          <input id="sp-fonte-${s.id}" name="fonte" maxlength="120" value="${esc(fonteDiretta(s.fonte) ? "" : s.fonte)}" placeholder="Es. Guida del Parco, ed. 2021, p. 34">
          <label class="spunta"><input type="checkbox" name="diretta"> Conoscenza diretta: conosco il posto</label>
          <div class="riga"><button class="btn primario piccolo" type="submit">Convalida</button><button class="btn secondario piccolo" type="button" data-azione="scarta" data-id="${u.id}" data-spunto="${s.id}">Scarta</button></div>
        </form>`}
    </div>`;
  }
  V.soste = (id) => {
    const u = uscita(id);
    if (!u) return nonTrovata();
    dati(u);
    const soste = [...u.soste].sort((a, b) => (a.km ?? 0) - (b.km ?? 0) || String(a.ora).localeCompare(String(b.ora)));
    const senza = u.spunti.filter((s) => !u.soste.some((x) => x.id === s.sostaId));
    const n = u.spunti.length;
    return `${testa(u, "Soste e spunti")}
    <div class="chips"><span class="chip ${n >= MAX_SPUNTI ? "c-attenzione" : "c-info"}">${n}/${MAX_SPUNTI} spunti</span><span class="chip c-ok">${u.spunti.filter((s) => s.stato === "convalidato").length} convalidati</span></div>
    <form class="box modulo" data-form="us-sosta" data-id="${u.id}">
      <span class="eti">Nuova sosta</span>
      <label for="so-nome">Nome della sosta *</label>
      <input id="so-nome" name="nome" required maxlength="50" placeholder="Es. Fonte del Faggio" data-us-fuoco>
      <div class="due"><div><label for="so-km">Al km</label><input id="so-km" name="km" type="number" min="0" max="80" step="0.1"></div>
        <div><label for="so-ora">Ora prevista</label><input id="so-ora" name="ora" type="time"></div></div>
      <button class="btn secondario" type="submit">Aggiungi la sosta</button>
    </form>
    ${soste.map((x) => `<section class="box">
      <div class="riga"><span><b>${esc(x.nome)}</b><br><span class="nota">${x.km != null ? `km ${esc(C.numero(x.km))}` : "km —"} · ${x.ora ? esc(x.ora) : "ora —"}</span></span>
        <button class="btn icona" data-azione="us-sosta-via" data-id="${u.id}" data-sosta="${x.id}" aria-label="Elimina la sosta ${esc(x.nome)}" title="Elimina la sosta">✕</button></div>
      ${u.spunti.filter((s) => s.sostaId === x.id).map((s) => schedaSpunto(u, s)).join("") || `<p class="nota">Nessuno spunto per questa sosta.</p>`}
    </section>`).join("")}
    ${senza.length ? `<section class="box"><span class="eti">Spunti senza sosta</span>${senza.map((s) => schedaSpunto(u, s)).join("")}</section>` : ""}
    <form class="box modulo" data-form="us-spunto" data-id="${u.id}">
      <span class="eti">Nuovo spunto</span>
      ${n >= MAX_SPUNTI ? `<p class="testo-errore">Hai già ${MAX_SPUNTI} spunti, il massimo per un'uscita: scartane uno per aggiungerne un altro.</p>` : ""}
      <label for="sp-sosta">Sosta</label>
      <select id="sp-sosta" name="sosta" class="selettore"><option value="">Nessuna sosta</option>${soste.map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join("")}</select>
      <label for="sp-testo">Testo dello spunto *</label>
      <textarea id="sp-testo" name="testo" required maxlength="280" rows="3" placeholder="Cosa racconti in questa sosta"></textarea>
      <label for="sp-fonte">Fonte</label>
      <input id="sp-fonte" name="fonte" maxlength="120" placeholder="Libro, sito, ente o guida">
      <label class="spunta"><input type="checkbox" name="diretta"> Conoscenza diretta: conosco il posto</label>
      <label class="spunta"><input type="checkbox" name="convalida"> Segna subito come convalidato</label>
      <button class="btn primario" type="submit" ${n >= MAX_SPUNTI ? "disabled" : ""}>Aggiungi lo spunto</button>
      <p class="nota">Senza fonte o conoscenza diretta lo spunto resta da convalidare e i partecipanti non lo vedono. Numeri, anni e secoli senza fonte scritta vengono segnalati. Gli spunti proposti dall'AI restano etichettati anche dopo la convalida.</p>
    </form>`;
  };

  // ---------- F70 tappe e timeline ----------
  function timeline(u, conAzioni) {
    const fuori = new Set(tappeFuoriOrdine(u.tappe));
    let giornoPrec = null;
    return u.tappe.map((x, i) => {
      const nuovoGiorno = Number(x.giorno) !== giornoPrec;
      giornoPrec = Number(x.giorno);
      return `${nuovoGiorno ? `<span class="eti us-giorno">Giorno ${esc(x.giorno)} · ${esc(dataPiu(u.data, Number(x.giorno) - 1).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" }))}</span>` : ""}
      <div class="us-tappa">
        <div class="riga"><span><b>${x.ora ? esc(x.ora) + " · " : ""}${esc(x.titolo)}</b></span>
          ${conAzioni ? `<span class="azioni-persona">
            <button class="btn icona" data-azione="us-tappa-su" data-id="${u.id}" data-tappa="${x.id}" aria-label="Sposta su ${esc(x.titolo)}" ${i === 0 ? "disabled" : ""}>↑</button>
            <button class="btn icona" data-azione="us-tappa-giu" data-id="${u.id}" data-tappa="${x.id}" aria-label="Sposta giù ${esc(x.titolo)}" ${i === u.tappe.length - 1 ? "disabled" : ""}>↓</button>
            <button class="btn icona" data-azione="us-tappa-via" data-id="${u.id}" data-tappa="${x.id}" aria-label="Elimina ${esc(x.titolo)}">✕</button></span>` : ""}</div>
        ${x.descrizione ? `<p class="nota">${esc(x.descrizione)}</p>` : ""}
        ${conAzioni && fuori.has(x.id) ? `<p class="nota testo-attenzione">Questa tappa è del giorno ${esc(x.giorno)} ma viene dopo una tappa di un giorno successivo: controlla l'ordine.</p>` : ""}
      </div>`;
    }).join("");
  }
  V.tappe = (id) => {
    const u = uscita(id);
    if (!u) return nonTrovata();
    dati(u);
    const giorni = u.tappe.reduce((m, x) => Math.max(m, Number(x.giorno) || 1), 1);
    return `${testa(u, "Tappe e timeline")}
    <p class="nota">Per le uscite di più giorni. La timeline compare nella pagina pubblica e nel link personale dei partecipanti: non scrivere indirizzi privati.</p>
    <form class="box modulo" data-form="us-tappa" data-id="${u.id}">
      <span class="eti">Nuova tappa</span>
      <div class="due"><div><label for="ta-giorno">Giorno *</label><input id="ta-giorno" name="giorno" type="number" min="1" max="30" required value="${giorni}"></div>
        <div><label for="ta-ora">Ora</label><input id="ta-ora" name="ora" type="time"></div></div>
      <label for="ta-titolo">Tappa *</label>
      <input id="ta-titolo" name="titolo" required maxlength="60" placeholder="Es. Rifugio Monte Cucco → Val di Ranco" data-us-fuoco>
      <label for="ta-desc">Descrizione</label>
      <textarea id="ta-desc" name="descrizione" maxlength="240" rows="2" placeholder="Km, cena, pernotto, note"></textarea>
      <button class="btn secondario" type="submit">Aggiungi la tappa</button>
    </form>
    <section class="box">
      <div class="riga"><span class="eti">Timeline</span><span class="nota">${u.tappe.length ? `${giorni} ${giorni === 1 ? "giorno" : "giorni"}, ${u.tappe.length} tappe` : ""}</span></div>
      ${u.tappe.length ? timeline(u, true) : `<p class="nota">Nessuna tappa. Aggiungi la prima: la timeline appare qui e nella pagina pubblica.</p>`}
    </section>
    ${u.tappe.length ? `<a class="btn secondario" href="#pubblica/${u.id}">Vedi come la vedono i partecipanti</a>` : ""}`;
  };

  // ---------- F66 attività extra ----------
  // Euro con i centesimi solo quando servono (una quota divisa può non essere intera).
  const euroQ = (v) => Number(v).toLocaleString("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: Number.isInteger(Number(v)) ? 0 : 2, maximumFractionDigits: 2 });
  const ORG = { leader: "il leader", agenzia: "un'agenzia", fornitore: "un fornitore" };
  function testoExtra(u) {
    return `Extra per ${u.titolo}:\n${u.extra.map((x) => { const q = quotaExtra(x); return `- ${x.titolo}: ${x.modo === "persona" ? `${euroQ(x.costo)} a persona` : `${euroQ(x.costo)} in totale${q !== null ? `, ${euroQ(q)} a testa` : ""}`}. Organizza ${x.organizzatore.nome || ORG[x.organizzatore.tipo]}.`; }).join("\n")}\nI pagamenti si fanno direttamente a chi organizza, non nell'app. Ditemi se aderite.\n${nomeLeader()}`;
  }
  V.extra = (id) => {
    const u = uscita(id);
    if (!u) return nonTrovata();
    dati(u);
    const conf = confermati(u);
    for (const x of u.extra) x.aderenti = x.aderenti.filter((pid) => u.partecipanti.some((p) => p.id === pid)); // chi è cancellato sparisce
    return `${testa(u, "Attività extra")}
    <form class="box modulo" data-form="us-extra" data-id="${u.id}">
      <span class="eti">Nuovo extra</span>
      <label for="ex-titolo">Cosa *</label>
      <input id="ex-titolo" name="titolo" required maxlength="60" placeholder="Es. Cena in rifugio" data-us-fuoco>
      <div class="due"><div><label for="ex-costo">Costo € *</label><input id="ex-costo" name="costo" type="number" min="0" max="5000" step="0.01" required></div>
        <div><label for="ex-modo">Il costo è</label><select id="ex-modo" name="modo"><option value="persona">a persona</option><option value="totale">totale, da dividere</option></select></div></div>
      <div class="due"><div><label for="ex-org">Chi organizza *</label><select id="ex-org" name="org"><option value="leader">Io (leader)</option><option value="agenzia">Agenzia</option><option value="fornitore">Fornitore</option></select></div>
        <div><label for="ex-orgnome">Nome</label><input id="ex-orgnome" name="orgnome" maxlength="50" placeholder="Es. Rifugio Esempio"></div></div>
      <button class="btn secondario" type="submit">Aggiungi l'extra</button>
      <p class="nota">I pagamenti restano fuori dall'app: nessun incasso viene registrato. Se rivendi servizi di terzi, verifica gli obblighi con un legale.</p>
    </form>
    ${u.extra.map((x) => { const q = quotaExtra(x); return `<section class="box">
      <div class="riga"><span><b>${esc(x.titolo)}</b><br><span class="nota">Organizza ${esc(x.organizzatore.nome ? `${x.organizzatore.nome} (${x.organizzatore.tipo})` : ORG[x.organizzatore.tipo])}</span></span>
        <button class="btn icona" data-azione="us-extra-via" data-id="${u.id}" data-extra="${x.id}" aria-label="Elimina ${esc(x.titolo)}">✕</button></div>
      <div class="dati">
        <div class="dato"><b>${euroQ(x.costo)}</b><span>${x.modo === "persona" ? "a persona" : "totale"}</span></div>
        <div class="dato"><b>${x.aderenti.length}</b><span>aderenti</span></div>
        <div class="dato"><b>${q === null ? "—" : euroQ(q)}</b><span>per partecipante</span></div>
      </div>
      ${conf.length ? `<div class="chips">${conf.map((p) => `<button class="btn secondario piccolo" aria-pressed="${x.aderenti.includes(p.id)}" data-azione="us-extra-ader" data-id="${u.id}" data-extra="${x.id}" data-p="${p.id}">${x.aderenti.includes(p.id) ? "✓ " : ""}${esc(p.nome)}</button>`).join("")}</div>
        <p class="nota">Tocca un nome per segnare chi aderisce.</p>` : `<p class="nota">Nessun confermato a cui proporlo.</p>`}
    </section>`; }).join("")}
    ${u.extra.length ? `<section class="box">
      <span class="eti">Totale extra per partecipante</span>
      ${conf.map((p) => `<div class="riga"><span>${esc(p.nome)}</span><b>${euroQ(totalePerPartecipante(u.extra, p.id))}</b></div>`).join("")}
      <p class="nota">Solo promemoria dei costi: chi paga cosa lo gestite fuori dall'app.</p>
    </section>
    <button class="btn primario" data-azione="us-extra-copia" data-id="${u.id}">Copia gli extra per WhatsApp</button>` : `<p class="nota">Nessun extra per questa uscita.</p>`}`;
  };

  // ---------- F68 sondaggio ----------
  V.sondaggio = (id) => {
    const u = uscita(id);
    if (!u) return nonTrovata();
    dati(u);
    return `${testa(u, "Sondaggio")}
    <form class="box modulo" data-form="us-sondaggio" data-id="${u.id}">
      <label for="so-dom">Domanda *</label>
      <input id="so-dom" name="domanda" required maxlength="120" placeholder="Es. Pranzo al sacco o in rifugio?" data-us-fuoco>
      ${[1, 2, 3, 4].map((i) => `<label for="so-op${i}">Opzione ${i}${i <= 2 ? " *" : ""}</label><input id="so-op${i}" name="op${i}" maxlength="60" ${i <= 2 ? "required" : ""}>`).join("")}
      <button class="btn primario" type="submit">Crea il testo</button>
      <p class="nota">Da 2 a 4 opzioni. L'app non scrive nei gruppi: copi il testo e lo incolli tu.</p>
    </form>
    ${[...u.sondaggi].reverse().map((s) => `<section class="box">
      <div class="fumetto">${esc(testoSondaggio(u.titolo, s))}</div>
      <div class="riga"><button class="btn primario piccolo" data-azione="us-sond-copia" data-id="${u.id}" data-sond="${s.id}">Copia per WhatsApp</button>
        <button class="btn icona" data-azione="us-sond-via" data-id="${u.id}" data-sond="${s.id}" aria-label="Elimina il sondaggio">✕</button></div>
    </section>`).join("")}
    ${u.sondaggi.length ? `<p class="nota">In WhatsApp puoi anche usare Sondaggio dal menu degli allegati: incolla domanda e opzioni.</p>` : ""}`;
  };

  // ---------- F16 promemoria ----------
  function testoPromemoria(u, chiave) {
    const m = messaggiDi(u);
    if (chiave === "annuncio") return m.annuncio;
    if (chiave === "giorno") return m.giorno;
    if (chiave === "conferme") return `Ciao a tutti, mancano due giorni a ${u.titolo} (${dataLunga(u.data)}).\nChi ha chiesto un posto e non ha ancora la conferma, me lo scriva entro stasera.\nChi è confermato apra il suo link e confermi lo zaino.\n${nomeLeader()}`;
    return `Grazie a tutti per ${u.titolo}!\nSe avete foto da condividere, mandatele nel gruppo (solo di chi ha dato il consenso).\nDue righe sulla giornata mi aiutano a preparare le prossime uscite.\nAlla prossima, ${nomeLeader()}`;
  }
  const uscitaAttiva = (u) => u.stato === "pubblicata" || u.stato === "conclusa";
  function promemoriaDaFare() {
    const out = [];
    for (const u of S.uscite) {
      if (!uscitaAttiva(u)) continue;
      dati(u);
      for (const m of MOMENTI) if (statoMomento(m, giorniA(u.data)) === "ora" && !u.promemoriaFatti[m.chiave]) out.push({ u, m });
    }
    return out;
  }
  V.promemoria = (id) => {
    const u = uscita(id);
    if (!u) return nonTrovata();
    dati(u);
    const g = giorniA(u.data), k = conti(u);
    return `${testa(u, "Promemoria")}
    <p class="nota">Promemoria per te, nei momenti previsti: compaiono anche in Oggi. Campo Base non scrive ai partecipanti: copi il testo e lo incolli nel gruppo.</p>
    ${uscitaAttiva(u) ? "" : `<p class="testo-attenzione">L'uscita non è pubblicata: i promemoria partono quando la pubblichi.</p>`}
    ${MOMENTI.map((m) => {
      const st = statoMomento(m, g), fatto = !!u.promemoriaFatti[m.chiave];
      const chip = fatto ? `<span class="chip c-ok">Fatto</span>` : st === "ora" ? `<span class="chip c-attenzione">Da fare ora</span>` : st === "futuro" ? `<span class="chip c-bozza">Da fare</span>` : `<span class="chip c-bozza">Momento passato</span>`;
      return `<section class="box">
        <div class="riga"><span class="eti">${esc(m.quando)} · ${esc(dataPiu(u.data, m.offset).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" }))}</span>${chip}</div>
        <b>${esc(m.titolo)}</b>
        ${m.chiave === "conferme" ? `<p class="nota">Ora: ${k.richieste} richieste da confermare, ${k.senzaChecklist.length} confermati senza zaino letto. <a href="#partecipanti/${u.id}">Iscritti</a></p>` : ""}
        ${m.chiave === "giorno" ? `<p class="nota">Preparalo il giorno prima e incollalo nel gruppo la mattina dell'uscita.</p>` : ""}
        <div class="fumetto">${esc(testoPromemoria(u, m.chiave))}</div>
        <div class="riga"><button class="btn primario piccolo" data-azione="us-prom-copia" data-id="${u.id}" data-chiave="${m.chiave}">Copia</button>
          <button class="btn secondario piccolo" data-azione="us-prom-fatto" data-id="${u.id}" data-chiave="${m.chiave}">${fatto ? "Segna da fare" : "Segna fatto"}</button></div>
      </section>`;
    }).join("")}`;
  };

  // ---------- F83 + F89 zaino ----------
  function vociZaino(voci, uid, conAzioni) {
    return voci.map((v) => `<div class="riga us-voce">
      <span>${esc(v.testo)}${v.link && linkVisibile(v.link) ? `<br><a class="nota" href="${esc(v.link.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(v.link.etichetta || "Scheda")} ↗</a> <span class="nota">· link neutro, verificato il ${esc(new Date(v.link.verificato + "T12:00").toLocaleDateString("it-IT"))}</span>${linkDaRiverificare(v.link) ? ` <span class="chip c-attenzione">Da riverificare</span>` : ""}` : ""}</span>
      ${conAzioni ? `<span class="azioni-persona">${v.link && linkVisibile(v.link) ? `<button class="btn icona" data-azione="us-z-verifica" data-zaino="${uid}" data-voce="${v.id}" aria-label="Link verificato oggi" title="Link verificato oggi">⟳</button>` : ""}
        <button class="btn icona" data-azione="us-z-via" data-zaino="${uid}" data-voce="${v.id}" aria-label="Elimina ${esc(v.testo)}">✕</button></span>` : ""}
    </div>`).join("");
  }
  function formZaino(uid) {
    return `<form class="box modulo" data-form="us-zaino" data-zaino="${uid}">
      <span class="eti">Nuova voce</span>
      <label for="z-testo">Oggetto *</label><input id="z-testo" name="testo" required maxlength="80" placeholder="Es. Ramponcini">
      <label for="z-et">Link: etichetta</label><input id="z-et" name="etichetta" maxlength="40" placeholder="Es. Come sceglierli">
      <label for="z-url">Link: indirizzo (https)</label><input id="z-url" name="url" type="url" maxlength="300" placeholder="https://…">
      <label for="z-ver">Link: verificato il</label><input id="z-ver" name="verificato" type="date" value="${oggiIso()}">
      <button class="btn secondario" type="submit">Aggiungi</button>
      <p class="nota">Solo link neutri (tipo "neutro"): nessun link affiliato o sponsorizzato in Fase 1. Dopo ${GIORNI_VERIFICA_LINK} giorni il link va riverificato.</p>
    </form>`;
  }
  function bloccoApprova(z, uid, u) {
    const letti = u ? confermati(u).filter((p) => p.checklist).length : 0;
    return z.approvato
      ? `<p class="testo-ok">Approvato il ${esc(quandoBreve(z.approvato))}: i partecipanti lo vedono dal loro link.</p>`
      : `<p class="testo-attenzione">Non approvato: i partecipanti ${z.voci.length ? "non vedono queste voci" : "vedono la checklist di base"}.</p>
        <button class="btn primario" data-azione="us-z-approva" data-zaino="${uid}" ${z.voci.length ? "" : "disabled"}>Approva lo zaino${letti && u ? ` (${letti} conferme di lettura da rifare)` : ""}</button>`;
  }
  let ultimaUscitaZaino = null;
  V.zaino = (id) => {
    if (id === "generale") {
      const z = zainoGenerale();
      return `${ultimaUscitaZaino && uscita(ultimaUscitaZaino) ? indietro(`#zaino/${ultimaUscitaZaino}`, "Zaino dell'uscita") : indietro("#uscite", "Uscite")}
      <h1>Zaino generale</h1>
      <p class="nota">Vale per tutte le tue uscite di trekking. Ogni modifica va riapprovata.</p>
      <section class="box"><span class="eti">Voci</span>${vociZaino(z.voci, "generale", true) || `<p class="nota">Nessuna voce.</p>`}${bloccoApprova(z, "generale", null)}</section>
      ${formZaino("generale")}`;
    }
    const u = uscita(id);
    if (!u) return nonTrovata();
    dati(u); ultimaUscitaZaino = u.id;
    const conf = confermati(u), letti = conf.filter((p) => p.checklist);
    return `${testa(u, "Zaino consigliato")}
    <section class="box"><div class="riga"><span class="eti">Generale</span><a class="btn secondario piccolo" href="#zaino/generale">Modifica</a></div>
      ${vociZaino(zainoGenerale().voci, "generale", false)}
      <p class="nota">${zainoGenerale().approvato ? "Approvato." : "Non ancora approvato."}</p></section>
    <section class="box"><span class="eti">Specifico per questa uscita</span>
      ${vociZaino(u.zaino.voci, u.id, true) || `<p class="nota">Nessuna voce specifica. Dal Briefing puoi aggiungere quelle della bozza automatica.</p>`}
      ${bloccoApprova(u.zaino, u.id, u)}</section>
    ${formZaino(u.id)}
    <section class="box"><div class="riga"><span class="eti">Conferme di lettura</span><b>${letti.length}/${conf.length}</b></div>
      <p class="nota">${conf.length - letti.length ? `Non hanno ancora letto: ${conf.filter((p) => !p.checklist).map((p) => esc(p.nome)).join(", ")}.` : "Tutti i confermati hanno letto lo zaino."} È la stessa conferma della checklist.</p></section>`;
  };
  function zainoDa(uid) { return uid === "generale" ? zainoGenerale() : dati(uscita(uid)).zaino; }

  // ---------- integrazione nelle viste esistenti ----------
  const LINK_SOTTOMENU = (u) => `<a href="#briefing/${u.id}">Briefing</a><a href="#soste/${u.id}">Soste</a><a href="#tappe/${u.id}">Tappe</a><a href="#extra/${u.id}">Extra</a><a href="#zaino/${u.id}">Zaino</a><a href="#promemoria/${u.id}">Promemoria</a><a href="#sondaggio/${u.id}">Sondaggio</a>`;
  const uscitaBaseMU = V.uscita;
  V.uscita = (id) => {
    let html = uscitaBaseMU(id);
    const u = uscita(id);
    if (!u) return html;
    const a = html.indexOf('<nav class="sottomenu" aria-label="Sezioni dell\'uscita">');
    const b = a >= 0 ? html.indexOf("</nav>", a) : -1;
    if (b >= 0) html = html.slice(0, b) + LINK_SOTTOMENU(u) + html.slice(b);
    return html.replace('<span class="eti">Spunti sul territorio</span>', `<div class="riga"><span class="eti">Spunti sul territorio</span><a class="btn secondario piccolo" href="#soste/${u.id}">Soste e fonti</a></div>`);
  };

  const oggiBaseMU = V.oggi;
  V.oggi = () => {
    let html = oggiBaseMU();
    const u = S.uscite.filter((x) => x.stato === "pubblicata" && giorniA(x.data) >= 0).sort((a, b) => a.data.localeCompare(b.data))[0];
    const daFare = promemoriaDaFare();
    const prom = daFare.length ? `<section class="box"><div class="riga"><span class="eti">Promemoria per te</span><span class="chip c-attenzione">${daFare.length}</span></div>
      ${daFare.map(({ u: x, m }) => `<a class="riga link-uscita" href="#promemoria/${x.id}"><span><b>${esc(m.titolo)}</b><br><span class="nota">${esc(x.titolo)} · ${esc(m.quando)}</span></span><span aria-hidden="true">›</span></a>`).join("")}</section>` : "";
    const rapide = u ? `<div class="azioni">
      <a class="btn tasto" href="#extra/${u.id}" data-azione="us-rapida"><span aria-hidden="true">＋</span>Extra</a>
      <a class="btn tasto" href="#soste/${u.id}" data-azione="us-rapida"><span aria-hidden="true">＋</span>Sosta</a>
      <a class="btn tasto" href="#sondaggio/${u.id}" data-azione="us-rapida"><span aria-hidden="true">＋</span>Sondaggio</a>
    </div>` : "";
    const a = html.indexOf('<div class="azioni">');
    const b = a >= 0 ? html.indexOf("</div>", a) : -1;
    if (b >= 0) return html.slice(0, b + 6) + rapide + prom + html.slice(b + 6);
    return html + rapide + prom;
  };

  // Pagina pubblica: timeline e soste con i soli spunti convalidati.
  function sezionePubblica(u) {
    dati(u);
    const tl = u.tappe.length ? `<section class="box"><span class="eti">Programma</span>${timeline(u, false)}</section>` : "";
    const soste = [...u.soste].sort((a, b) => (a.km ?? 0) - (b.km ?? 0))
      .map((x) => ({ x, sp: u.spunti.filter((s) => s.sostaId === x.id && s.stato === "convalidato") }));
    const ss = soste.length ? `<section class="box"><span class="eti">Soste</span>${soste.map(({ x, sp }) => `<div class="spunto"><b>${esc(x.nome)}</b>${x.ora ? ` <span class="nota">verso le ${esc(x.ora)}</span>` : ""}
      ${sp.map((s) => `<p>${esc(s.testo)}</p><p class="nota">${s.ai ? `<span class="chip c-ai">✦ Proposto dall'AI, convalidato dal leader</span> ` : ""}Fonte: ${esc(s.fonte)}</p>`).join("")}</div>`).join("")}</section>` : "";
    return tl + ss;
  }
  const pubblicaBaseMU = V.pubblica;
  V.pubblica = (id) => {
    const html = pubblicaBaseMU(id);
    const u = uscita(id);
    if (!u) return html;
    const extra = sezionePubblica(u);
    const i = html.indexOf('<form class="box modulo" data-form="richiesta"');
    return i >= 0 ? html.slice(0, i) + extra + html.slice(i) : html + extra;
  };

  // Link personale: timeline, zaino approvato al posto della checklist di base, extra con la propria adesione.
  const pBaseMU = V.p;
  V.p = (codice) => {
    let html = pBaseMU(codice);
    const t = trovaPerCodice(codice);
    if (!t || Date.now() > t.p.link.scade) return html;
    const { u, p } = t;
    dati(u);
    const zg = zainoGenerale();
    const voci = (zg.approvato ? zg.voci : []).concat(u.zaino.approvato ? u.zaino.voci : []);
    if (voci.length) {
      html = html.replace(/<ul class="lista-check">[\s\S]*?<\/ul>/, `<p class="nota">Zaino consigliato da ${esc(nomeLeader())}, letto e approvato.</p>${zg.approvato ? `<p class="nota">Generale</p>${vociZaino(zg.voci, "", false)}` : ""}${u.zaino.approvato ? `<p class="nota">Per questa uscita</p>${vociZaino(u.zaino.voci, "", false)}` : ""}`);
    }
    const extra = u.extra.length && p.stato === "confermato" ? `<section class="box"><span class="eti">Extra</span>${u.extra.map((x) => { const q = quotaExtra(x); return `<div class="riga"><span>${esc(x.titolo)}<br><span class="nota">${q === null ? euroQ(x.costo) + " in totale" : euroQ(q) + " a persona"} · organizza ${esc(x.organizzatore.nome || ORG[x.organizzatore.tipo])}</span></span><span class="chip ${x.aderenti.includes(p.id) ? "c-ok" : "c-bozza"}">${x.aderenti.includes(p.id) ? "Aderisci" : "Non aderisci"}</span></div>`; }).join("")}<p class="nota">Per aderire o pagare scrivi a chi organizza: i pagamenti non passano dall'app.</p></section>` : "";
    const tl = u.tappe.length ? `<section class="box"><span class="eti">Programma</span>${timeline(u, false)}</section>` : "";
    // I segni restano invariati (titolo "Checklist dell'attrezzatura" e pulsante): altri moduli li usano come punti di aggancio.
    const i = html.indexOf(`<section class="box"><span class="eti">Checklist dell'attrezzatura</span>`);
    if (i >= 0) html = html.slice(0, i) + tl + html.slice(i); else html += tl;
    const fine = html.indexOf('<p class="nota">Questo link è solo tuo');
    return fine >= 0 ? html.slice(0, fine) + extra + html.slice(fine) : html + extra;
  };

  // ---------- eventi ----------
  let fuocoRapido = false;
  window.addEventListener("hashchange", () => {
    if (!fuocoRapido) return;
    fuocoRapido = false;
    document.querySelector("[data-us-fuoco]")?.focus();
  });

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-azione]");
    if (!el || !el.dataset.azione.startsWith("us-")) return;
    const az = el.dataset.azione;
    if (az === "us-rapida") { fuocoRapido = true; return; }
    const u = el.dataset.id ? uscita(el.dataset.id) : null;
    if (u) dati(u);
    const conferma = (testo) => { if (el.dataset.conferma === "si") return true; el.dataset.conferma = "si"; el.textContent = testo; el.classList.add("pericolo"); return false; };
    switch (az) {
      case "us-br-aggiungi": {
        const v = vociBriefing(u)[Number(el.dataset.i)];
        if (!v) return;
        u.zaino.voci.push({ id: nuovoId(), testo: v.testo, link: null }); u.zaino.approvato = null;
        avviso("Aggiunta allo zaino dell'uscita: ricordati di approvarlo"); break;
      }
      case "us-br-copia": S.eventi.messaggiCopiati++; salva(); copia(testoBriefing(u), "Briefing copiato: incollalo nel gruppo WhatsApp"); return;
      case "us-sp-riapri": { const s = u.spunti.find((x) => x.id === Number(el.dataset.spunto)); if (s) s.stato = "da convalidare"; break; }
      case "us-sosta-via": {
        if (!conferma("Sicuro?")) return;
        const sid = Number(el.dataset.sosta);
        u.soste = u.soste.filter((x) => x.id !== sid);
        u.spunti.forEach((s) => { if (s.sostaId === sid) delete s.sostaId; });
        avviso("Sosta eliminata: i suoi spunti restano senza sosta"); break;
      }
      case "us-tappa-su": case "us-tappa-giu": {
        const i = u.tappe.findIndex((x) => x.id === Number(el.dataset.tappa));
        if (!sposta(u.tappe, i, az === "us-tappa-su" ? -1 : 1)) return;
        break;
      }
      case "us-tappa-via": if (!conferma("Sicuro?")) return; u.tappe = u.tappe.filter((x) => x.id !== Number(el.dataset.tappa)); break;
      case "us-extra-ader": {
        const x = u.extra.find((y) => y.id === Number(el.dataset.extra)), pid = Number(el.dataset.p);
        if (!x) return;
        x.aderenti = x.aderenti.includes(pid) ? x.aderenti.filter((v) => v !== pid) : x.aderenti.concat(pid);
        break;
      }
      case "us-extra-via": if (!conferma("Sicuro?")) return; u.extra = u.extra.filter((x) => x.id !== Number(el.dataset.extra)); break;
      case "us-extra-copia": S.eventi.messaggiCopiati++; salva(); copia(testoExtra(u), "Extra copiati: incollali nel gruppo WhatsApp"); return;
      case "us-sond-copia": {
        const s = u.sondaggi.find((x) => x.id === Number(el.dataset.sond));
        if (!s) return;
        S.eventi.messaggiCopiati++; salva(); copia(testoSondaggio(u.titolo, s), "Sondaggio copiato: incollalo nel gruppo WhatsApp"); return;
      }
      case "us-sond-via": u.sondaggi = u.sondaggi.filter((x) => x.id !== Number(el.dataset.sond)); break;
      case "us-prom-copia": S.eventi.messaggiCopiati++; salva(); copia(testoPromemoria(u, el.dataset.chiave), "Testo copiato: incollalo nel gruppo WhatsApp"); return;
      case "us-prom-fatto": u.promemoriaFatti[el.dataset.chiave] = !u.promemoriaFatti[el.dataset.chiave]; break;
      case "us-z-via": case "us-z-verifica": case "us-z-approva": {
        const uid = el.dataset.zaino, z = zainoDa(uid === "generale" ? uid : Number(uid));
        if (az === "us-z-approva") {
          z.approvato = new Date().toISOString();
          // Si approva solo dopo una modifica: chi aveva letto deve rileggere (si riusa la conferma della checklist).
          const lista = uid === "generale" ? S.uscite.filter((x) => x.stato === "pubblicata" && giorniA(x.data) >= 0) : [uscita(uid)];
          let rifare = 0;
          for (const x of lista) for (const p of confermati(x)) if (p.checklist) { p.checklist = false; rifare++; }
          avviso(rifare ? `Zaino approvato: ${rifare} persone dovranno confermare di nuovo la lettura` : "Zaino approvato"); break;
        }
        const v = z.voci.find((x) => x.id === Number(el.dataset.voce));
        if (!v) return;
        if (az === "us-z-via") { z.voci = z.voci.filter((x) => x !== v); z.approvato = null; }
        else { v.link.verificato = oggiIso(); avviso("Link segnato come verificato oggi"); }
        break;
      }
      default: return;
    }
    ridisegna();
  });

  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.usCambio !== "sp-sosta") return;
    const u = dati(uscita(el.dataset.id));
    const s = u.spunti.find((x) => x.id === Number(el.dataset.spunto));
    if (!s) return;
    if (el.value) s.sostaId = Number(el.value); else delete s.sostaId;
    ridisegna();
  });

  document.addEventListener("submit", (e) => {
    const f = e.target;
    if (!f.dataset.form || !f.dataset.form.startsWith("us-")) return;
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    const testo = (k, max) => String(d[k] || "").trim().slice(0, max);
    if (f.dataset.form === "us-zaino") {
      const uid = f.dataset.zaino, z = zainoDa(uid === "generale" ? uid : Number(uid));
      const voce = testo("testo", 80);
      if (!voce) { avviso("Scrivi l'oggetto da mettere nello zaino."); return; }
      const url = testo("url", 300);
      if (url && !urlValido(url)) { avviso("Il link deve iniziare con https:// ed essere un indirizzo completo."); return; }
      if (url && !d.verificato) { avviso("Indica la data in cui hai verificato il link."); return; }
      z.voci.push({ id: nuovoId(), testo: voce, link: url ? { tipo: "neutro", etichetta: testo("etichetta", 40) || "Scheda", url, verificato: d.verificato } : null });
      z.approvato = null;
      ridisegna(); avviso("Voce aggiunta: approva lo zaino per mostrarlo ai partecipanti"); return;
    }
    const u = uscita(f.dataset.id);
    if (!u) return;
    dati(u);
    switch (f.dataset.form) {
      case "us-sosta": {
        const nome = testo("nome", 50);
        if (!nome) { avviso("Scrivi il nome della sosta."); return; }
        const km = d.km === "" ? null : Number(d.km);
        if (km !== null && !(km >= 0 && km <= 80)) { avviso("Il km della sosta va da 0 a 80."); return; }
        u.soste.push({ id: nuovoId(), nome, km, ora: d.ora || "" });
        avviso("Sosta aggiunta"); break;
      }
      case "us-spunto": {
        if (u.spunti.length >= MAX_SPUNTI) { avviso(`Massimo ${MAX_SPUNTI} spunti per uscita: scartane uno prima.`); return; }
        const t = testo("testo", 280);
        if (!t) { avviso("Scrivi il testo dello spunto."); return; }
        const fonte = d.diretta ? FONTE_DIRETTA : testo("fonte", 120);
        let stato = "da convalidare";
        if (d.convalida) {
          if (!fonteValida(fonte)) { avviso("Per convalidare serve una fonte o la conoscenza diretta: lo spunto non è stato salvato."); return; }
          stato = "convalidato";
        }
        const s = { id: nuovoId(), testo: t, ai: false, fonte, stato };
        if (d.sosta) s.sostaId = Number(d.sosta);
        u.spunti.push(s);
        avviso(stato === "convalidato" ? "Spunto convalidato" : "Spunto salvato da convalidare"); break;
      }
      case "us-sp-convalida": {
        const s = u.spunti.find((x) => x.id === Number(f.dataset.spunto));
        if (!s) return;
        const fonte = d.diretta ? FONTE_DIRETTA : testo("fonte", 120);
        if (!fonteValida(fonte)) { avviso("Aggiungi una fonte o spunta Conoscenza diretta: senza, lo spunto non si convalida."); return; }
        s.fonte = fonte; s.stato = "convalidato"; // s.ai resta com'è: l'etichetta AI non si perde
        avviso(numeroSenzaFonte(s) ? "Convalidato, ma contiene numeri con la sola conoscenza diretta" : "Spunto convalidato"); break;
      }
      case "us-tappa": {
        const titolo = testo("titolo", 60), giorno = Number(d.giorno);
        if (!titolo || !(giorno >= 1 && giorno <= 30)) { avviso("Indica la tappa e un giorno da 1 a 30."); return; }
        // Nuova tappa dopo l'ultima dello stesso giorno o di un giorno precedente.
        let pos = u.tappe.length;
        while (pos > 0 && Number(u.tappe[pos - 1].giorno) > giorno) pos--;
        u.tappe.splice(pos, 0, { id: nuovoId(), giorno, ora: d.ora || "", titolo, descrizione: testo("descrizione", 240) });
        avviso("Tappa aggiunta"); break;
      }
      case "us-extra": {
        const titolo = testo("titolo", 60), costo = Number(d.costo);
        if (!titolo || d.costo === "" || !(costo >= 0)) { avviso("Indica cosa è l'extra e il suo costo."); return; }
        const tipo = ["leader", "agenzia", "fornitore"].includes(d.org) ? d.org : "leader";
        u.extra.push({ id: nuovoId(), titolo, costo, modo: d.modo === "totale" ? "totale" : "persona", organizzatore: { tipo, nome: testo("orgnome", 50) }, aderenti: [] });
        avviso("Extra aggiunto: segna chi aderisce"); break;
      }
      case "us-sondaggio": {
        const domanda = testo("domanda", 120);
        const opzioni = opzioniValide([1, 2, 3, 4].map((i) => testo("op" + i, 60)));
        if (!domanda || !opzioni) { avviso("Scrivi la domanda e da 2 a 4 opzioni."); return; }
        u.sondaggi.push({ id: nuovoId(), domanda, opzioni, creato: new Date().toISOString() });
        avviso("Sondaggio pronto: copialo per WhatsApp"); break;
      }
      default: return;
    }
    ridisegna();
  });

  return regole;
})();
if (typeof module !== "undefined") module.exports = ModuloUscita;
