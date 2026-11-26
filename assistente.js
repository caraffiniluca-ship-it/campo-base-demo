// Assistente del leader con la sua mascotte (anticipazione: mascotte in V2 per D25, assistente in 1C per F50).
// Nella demo NON usa un modello AI esterno: risponde solo con i dati delle uscite, quindi costa zero e non inventa.
// Regole del file: niente indicazioni di sicurezza, niente previsioni meteo, numeri solo da GPX e scheda, se non sa lo dice.
"use strict";

// ---------- mascotte ----------
const nomeMascotte = () => (S.leader.mascotteNome || S.leader.nome || "Assistente").split(" ")[0];
function immagineMascotte() {
  if (S.leader.mascotteFoto) return S.leader.mascotteFoto;                       // foto del leader in stile illustrato
  if (/^enrico\b/i.test(S.leader.nome || "")) return "icone/mascotte-enrico.svg"; // disegno già pronto di Enrico
  return null;                                                                    // altrimenti iniziali sui colori del marchio
}
function avatarMascotte(classe = "") {
  const img = immagineMascotte();
  return img
    ? `<img class="mascotte ${classe}" src="${esc(img)}" alt="Mascotte ${esc(nomeMascotte())}">`
    : `<span class="mascotte mascotte-iniziali ${classe}" aria-label="Mascotte ${esc(nomeMascotte())}">${esc(nomeMascotte().slice(0, 1).toUpperCase())}</span>`;
}

// Trasforma la foto in un ritratto illustrato, tutto sul telefono: colori ridotti e contorni scuri.
// Ridisegnare l'immagine su canvas toglie anche i metadati EXIF (posizione, dispositivo).
async function fotoInMascotte(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Usa una foto JPEG, PNG o WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("La foto supera 5 MB.");
  const bmp = await createImageBitmap(file);
  const L = 320, lato = Math.min(bmp.width, bmp.height);
  const cv = Object.assign(document.createElement("canvas"), { width: L, height: L });
  const g = cv.getContext("2d");
  g.drawImage(bmp, (bmp.width - lato) / 2, (bmp.height - lato) / 2, lato, lato, 0, 0, L, L);
  const im = g.getImageData(0, 0, L, L), d = im.data;
  const lum = new Float32Array(L * L);
  for (let i = 0; i < L * L; i++) lum[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  const livelli = 5, passo = 255 / (livelli - 1);
  for (let y = 0; y < L; y++) {
    for (let x = 0; x < L; x++) {
      const i = y * L + x, k = i * 4;
      const bordo = x < L - 1 && y < L - 1 ? Math.abs(lum[i] - lum[i + 1]) + Math.abs(lum[i] - lum[i + L]) : 0;
      if (bordo > 46) { d[k] = 20; d[k + 1] = 33; d[k + 2] = 61; continue; }       // contorno color notte
      for (let c = 0; c < 3; c++) {
        const media = (d[k] + d[k + 1] + d[k + 2]) / 3;
        const saturo = media + (d[k + c] - media) * 1.25;                          // colori un po' più vivi
        d[k + c] = Math.max(0, Math.min(255, Math.round(saturo / passo) * passo));
      }
    }
  }
  g.putImageData(im, 0, 0);
  return cv.toDataURL("image/jpeg", 0.82);
}

// ---------- benvenuto: alla registrazione si scelgono nome e foto, e la mascotte prende il nome del leader ----------
V.benvenuto = () => `<div class="accesso">
  <h1>Benvenuto in Gruvia</h1>
  <p>Due cose per iniziare. Il tuo nome diventa anche il nome della tua mascotte, l'assistente che risponde alle tue domande sulle uscite.</p>
  <form class="box modulo" data-form="benvenuto">
    <label for="bv-nome">Nome *</label>
    <input id="bv-nome" name="nome" required maxlength="40" autocomplete="given-name" value="${esc(S.leader.nome || "")}">
    <label for="bv-marchio">Nome della tua attività *</label>
    <input id="bv-marchio" name="marchio" required maxlength="50" value="${esc(S.leader.marchio || "")}">
    <label for="bv-foto">Foto profilo (facoltativa)</label>
    <input id="bv-foto" name="foto" type="file" accept="image/jpeg,image/png,image/webp" data-azione="foto-mascotte">
    <div class="anteprima-mascotte">${avatarMascotte("grande")}<p class="nota" id="nota-foto">${S.leader.mascotteFoto ? "La tua foto è diventata la mascotte." : immagineMascotte() ? "Per Enrico c'è già la mascotte disegnata. Puoi sostituirla con la tua foto." : "Senza foto la mascotte usa la tua iniziale."}</p></div>
    <button class="btn primario" type="submit">Inizia</button>
    <p class="nota">La foto viene trasformata e resta solo su questo telefono, senza metadati. Puoi cambiarla dal Profilo.</p>
  </form></div>`;

// ---------- assistente ----------
const DOMANDE = ["Chi manca per la prossima uscita?", "Quanti iscritti ho?", "A che ora dobbiamo rientrare?", "Sono al pareggio?", "Cosa scrivo nel gruppo?", "Ci sono richieste da confermare?"];

function prossimaUscita(testo) {
  const t = testo.toLowerCase();
  const attive = S.uscite.filter((u) => u.stato === "pubblicata" && giorniA(u.data) >= 0).sort((a, b) => a.data.localeCompare(b.data));
  return attive.find((u) => u.titolo.toLowerCase().split(/\s+/).some((w) => w.length > 4 && t.includes(w))) || attive[0] || null;
}

// Risposte costruite solo dai dati: ogni risposta dice da dove viene.
function rispondi(domanda) {
  const q = domanda.toLowerCase();
  const u = prossimaUscita(q);
  const ha = (...parole) => parole.some((p) => q.includes(p));
  if (ha("sicur", "pericol", "emergenz", "soccors", "incident", "ferit", "rischi")) {
    return { testo: "Sulla sicurezza non do indicazioni: valgono le tue procedure e il tuo giudizio. In emergenza il numero è il 112. Se vuoi, scrivi le istruzioni nella scheda dell'uscita e le riporterò così come le hai scritte.", fonte: "regola del progetto" };
  }
  if (ha("meteo", "tempo fa", "pioggia", "previsio", "neve", "vento")) {
    const c = u && u.consultazioni[u.consultazioni.length - 1];
    return { testo: `Non faccio previsioni meteo: le trovi dalla scheda dell'uscita, con il collegamento all'Aeronautica Militare.${c ? ` L'ultima volta le hai consultate il ${new Date(c.quando).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}${c.nota ? `, nota: "${c.nota}"` : ""}.` : " Per questa uscita non risultano consultazioni."}`, fonte: "registro delle consultazioni", link: u ? `#uscita/${u.id}` : null };
  }
  if (!u) return { testo: "Non hai uscite pubblicate in programma, quindi non ho dati su cui rispondere. Crea o pubblica un'uscita e riprova.", fonte: "elenco uscite", link: "#uscite" };
  const k = conti(u);
  if (ha("manca", "mancano", "checklist", "non hanno", "conferm") && !ha("richiest", "da confermare")) {
    return k.senzaChecklist.length
      ? { testo: `Per ${u.titolo} non hanno ancora confermato la checklist: ${k.senzaChecklist.map((p) => p.nome).join(", ").replace(/\.$/, "")}. Dalla schermata Oggi copi il promemoria in un tocco.`, fonte: "iscritti dell'uscita", link: "#oggi" }
      : { testo: `Per ${u.titolo} tutti i confermati hanno visto la checklist.`, fonte: "iscritti dell'uscita" };
  }
  if (ha("richiest", "da confermare", "in attesa")) {
    const r = u.partecipanti.filter((p) => p.stato === "richiesta");
    return { testo: r.length ? `Hai ${r.length} richieste da confermare per ${u.titolo}: ${r.map((p) => p.nome).join(", ")}.` : `Nessuna richiesta in attesa per ${u.titolo}.`, fonte: "iscritti dell'uscita", link: `#partecipanti/${u.id}` };
  }
  if (ha("iscritt", "quanti", "posti", "lista d")) {
    return { testo: `${u.titolo}: ${k.confermati} confermati su ${u.posti} posti, ${k.richieste} richieste da confermare e ${k.lista} in lista d'attesa.`, fonte: "iscritti dell'uscita", link: `#partecipanti/${u.id}` };
  }
  if (ha("tramont", "rientr", "ora limite", "buio", "orario", "che ora", "durata", "quanto dura")) {
    const b = briefing(u);
    return { testo: `${dataLunga(u.data)}: partenza ${u.oraPartenza}, durata stimata ${C.durata(b.ore)}, rientro previsto alle ${C.ora(b.rientro)}. Il tramonto è alle ${C.ora(b.tram)}, quindi l'ora limite di rientro è ${C.ora(b.limite)}${b.inTempo ? ": sei in margine." : ": il rientro stimato la supera, valuta di anticipare la partenza."}`, fonte: "GPX e calcolo del tramonto", link: `#uscita/${u.id}` };
  }
  if (ha("pareggio", "break", "guadagn", "margine", "soldi", "conviene", "spese", "ricav")) {
    const be = C.breakEven(u.prezzo, k.confermati, u.spese);
    return { testo: be.mancano ? `Per ${u.titolo} ti mancano ${be.mancano} iscritti al pareggio (${be.pareggio} servono, ne hai ${k.confermati}). Spese previste ${C.euro(be.totaleSpese)}.` : `Per ${u.titolo} sei oltre il pareggio: ricavi previsti ${C.euro(be.ricavi)}, spese ${C.euro(be.totaleSpese)}, margine ${C.euro(be.margine)}.`, fonte: "scheda e iscritti, nessun incasso registrato", link: `#uscita/${u.id}` };
  }
  if (ha("scriv", "messagg", "whatsapp", "gruppo", "promemoria", "annunc")) {
    return { testo: `Ecco il promemoria pronto per ${u.titolo}:\n\n${messaggiDi(u).promemoria}`, fonte: "scheda dell'uscita", link: `#messaggi/${u.id}`, copia: messaggiDi(u).promemoria };
  }
  return { testo: "Non lo so. Posso rispondere su iscritti, chi manca, richieste, orari di rientro, pareggio e messaggi pronti delle tue uscite. Per il resto decidi tu.", fonte: "nessuna" };
}

V.assistente = () => {
  const chat = S.chat || [];
  return `<div class="assistente">
    ${indietro("#oggi", "Oggi")}
    <div class="testa-assistente">${avatarMascotte("grande")}<div><h1>${esc(nomeMascotte())}</h1>
      <span class="chip c-ai">✦ Assistente automatico</span></div></div>
    <p class="nota">Risponde solo con i dati delle tue uscite. Non dà indicazioni di sicurezza né previsioni meteo, e se non sa te lo dice. Nella demo non usa un'AI esterna.</p>
    <div class="chat" id="chat" aria-live="polite">
      ${chat.length ? "" : `<div class="msg bot">${avatarMascotte("piccola")}<div class="bolla">Ciao ${esc((S.leader.nome || "").split(" ")[0])}, sono ${esc(nomeMascotte())}. Chiedimi qualcosa sulle tue uscite.</div></div>`}
      ${chat.map((m) => m.da === "io"
        ? `<div class="msg io"><div class="bolla">${esc(m.testo)}</div></div>`
        : `<div class="msg bot">${avatarMascotte("piccola")}<div class="bolla">${esc(m.testo)}<span class="fonte">Risposta automatica · fonte: ${esc(m.fonte)}${m.link ? ` · <a href="${esc(m.link)}">apri</a>` : ""}</span>${m.copia ? `<button class="btn secondario piccolo" data-azione="copia-assistente" data-i="${chat.indexOf(m)}">Copia per WhatsApp</button>` : ""}</div></div>`).join("")}
    </div>
    <div class="suggerimenti">${DOMANDE.map((d) => `<button class="chip-domanda" data-azione="chiedi" data-domanda="${esc(d)}">${esc(d)}</button>`).join("")}</div>
    <form class="in-linea scrivi" data-form="domanda">
      <label class="visuale-nascosta" for="domanda">Domanda per ${esc(nomeMascotte())}</label>
      <input id="domanda" name="domanda" maxlength="200" autocomplete="off" placeholder="Scrivi una domanda…">
      <button class="btn primario" type="submit">Invia</button>
    </form>
    ${chat.length ? `<button class="btn secondario piccolo" data-azione="svuota-chat">Cancella la conversazione</button>` : ""}
  </div>`;
};

function chiedi(domanda) {
  const testo = domanda.trim().slice(0, 200);
  if (!testo) return;
  S.chat = (S.chat || []).concat({ da: "io", testo }, { da: "bot", ...rispondi(testo) }).slice(-30);
  salva(); mostra();
  const c = document.getElementById("chat"); if (c) c.lastElementChild?.scrollIntoView({ block: "end" });
  document.getElementById("domanda")?.focus();
}

// ---------- integrazione nelle schermate esistenti ----------
const vistaOggiBase = V.oggi;
V.oggi = () => vistaOggiBase() + `<a class="fab-mascotte" href="#assistente" aria-label="Chiedi a ${esc(nomeMascotte())}">${avatarMascotte("fab")}<span>Chiedi a ${esc(nomeMascotte())}</span></a>`;

const vistaProfiloBase = V.profilo;
V.profilo = () => vistaProfiloBase().replace('<section class="box">', `<section class="box">
      <span class="eti">La tua mascotte</span>
      <div class="anteprima-mascotte">${avatarMascotte("grande")}<div><b>${esc(nomeMascotte())}</b><p class="nota">Ti aiuta a rispondere alle domande sulle uscite. Prende il tuo nome e, se carichi una foto, il tuo aspetto.</p></div></div>
      <label class="eti" for="pr-foto">Cambia foto</label>
      <input id="pr-foto" type="file" accept="image/jpeg,image/png,image/webp" data-azione="foto-mascotte">
      ${S.leader.mascotteFoto ? `<button class="btn secondario piccolo" data-azione="foto-rimuovi">Togli la foto</button>` : ""}
      <a class="btn secondario" href="#assistente">Apri l'assistente</a>
    </section>
    <section class="box">`);

// ---------- eventi ----------
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-azione]");
  if (!el) return;
  if (el.dataset.azione === "chiedi") chiedi(el.dataset.domanda);
  if (el.dataset.azione === "svuota-chat") { S.chat = []; salva(); mostra(); }
  if (el.dataset.azione === "copia-assistente") { const m = S.chat[Number(el.dataset.i)]; if (m?.copia) { S.eventi.messaggiCopiati++; salva(); copia(m.copia, "Testo copiato: incollalo nel gruppo WhatsApp"); } }
  if (el.dataset.azione === "foto-rimuovi") { delete S.leader.mascotteFoto; salva(); mostra(); avviso("Foto tolta"); }
});

document.addEventListener("change", async (e) => {
  if (e.target.dataset.azione !== "foto-mascotte" || !e.target.files[0]) return;
  try {
    S.leader.mascotteFoto = await fotoInMascotte(e.target.files[0]);
    salva(); mostra(); avviso("La tua foto è diventata la mascotte");
  } catch (err) { avviso(err.message || "Non riesco a leggere questa foto."); }
});

document.addEventListener("submit", (e) => {
  const f = e.target;
  if (f.dataset.form === "domanda") { e.preventDefault(); chiedi(new FormData(f).get("domanda") || ""); }
  if (f.dataset.form === "benvenuto") {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    const nome = String(d.nome || "").trim().slice(0, 40), marchio = String(d.marchio || "").trim().slice(0, 50);
    if (!nome || !marchio) { avviso("Scrivi il tuo nome e quello della tua attività."); return; }
    // La mascotte prende il nome di chi si registra; il disegno di Enrico vale solo per Enrico.
    Object.assign(S.leader, { nome, marchio, mascotteNome: nome, configurato: true });
    salva(); location.hash = "#oggi"; avviso(`Ciao ${nome.split(" ")[0]}: la tua mascotte è pronta`);
  }
}, true);
