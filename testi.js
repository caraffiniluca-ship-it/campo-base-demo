// Testi dell'interfaccia separati dal codice (F82). L'italiano è la lingua principale; l'inglese è predisposto.
// Nella demo sono tradotti navigazione, titoli e avvisi principali: il resto si aggiunge qui, chiave per chiave.
"use strict";

const TESTI = {
  it: {
    banner: "DEMO · solo dati di esempio, non inserire dati reali",
    nav_oggi: "Oggi", nav_uscite: "Uscite", nav_profilo: "Profilo",
    titolo_uscite: "Uscite", titolo_profilo: "Profilo", titolo_iscritti: "Iscritti", titolo_messaggi: "Messaggi pronti",
    titolo_sentiero: "Modo sentiero", titolo_accesso: "Accedi a Gruvia",
    accesso_testo: "Ti mandiamo un link via email: lo apri e sei dentro. Nessuna password da ricordare.",
    accesso_email: "La tua email", accesso_invia: "Inviami il link",
    lingua: "Lingua dell'interfaccia",
  },
  en: {
    banner: "DEMO · sample data only, do not enter real data",
    nav_oggi: "Today", nav_uscite: "Outings", nav_profilo: "Profile",
    titolo_uscite: "Outings", titolo_profilo: "Profile", titolo_iscritti: "Participants", titolo_messaggi: "Ready-made messages",
    titolo_sentiero: "Trail mode", titolo_accesso: "Sign in to Gruvia",
    accesso_testo: "We email you a link: open it and you're in. No password to remember.",
    accesso_email: "Your email", accesso_invia: "Send me the link",
    lingua: "Interface language",
  },
};

let LINGUA = "it";
const t = (chiave) => (TESTI[LINGUA] && TESTI[LINGUA][chiave]) || TESTI.it[chiave] || chiave;
