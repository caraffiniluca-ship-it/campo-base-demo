# Campo Base · web app demo

Demo installabile su Android (e iPhone) della Fase 1. **Solo dati di esempio**: tutto resta nel browser del telefono, nessun dato va a un server. Non inserire dati reali di partecipanti.

## Cosa si può provare
Tutta la **Fase 1 (1A, 1B, 1C)** in versione dimostrativa, più l'assistente con la mascotte del leader (anticipazione di F50 e D25).

- **1A** · accesso del leader con link via email (simulato), benvenuto con nome e foto, uscite con import GPX, iscritti, link personale del partecipante (128 bit, con scadenza), messaggi pronti (anche per WhatsApp Eventi), pagina dell'uscita e pagina del leader, privacy (consensi con versione dell'informativa, esportazione, cancellazione), misura d'uso anonima, testi separati con inglese predisposto.
- **1B** · briefing, tramonto e ora limite, break-even, conferme a 48 e 24 ore, arrivi e partenze, esigenze con consenso, checklist, Modo sentiero, soste con spunti e fonti, post-uscita con feedback (visibile da 5 risposte), community WhatsApp con consenso, titoli e scadenzario modificabili, abbonamento (simulato), attività extra, azioni rapide, promemoria, sondaggio.
- **1C** · incolla l'annuncio, dal vocale al messaggio, spunti con convalida (max 12), pillole con trascrizione obbligatoria e versione inglese da verificare, zaino consigliato con link neutri, scheda struttura, assistente per i partecipanti (solo dati della scheda), pitch stampabile con altimetria da GPX, assistente camere, documenti e foto cifrati sul telefono, foto con consenso, lista d'attesa con offerta di 24 ore, passaggi al ritrovo, rubrica fornitori, tappe e timeline.

Dove il piano prevede l'AI, la demo usa regole sui propri dati ed è etichettata "Automatico": nessuna AI esterna, nessun costo.

## Installare su Android
1. Apri l'indirizzo https della demo con **Chrome**.
2. Menu ⋮ → **Installa app** (o "Aggiungi a schermata Home").
3. L'icona compare tra le app; si apre a schermo intero e funziona anche offline.

Su iPhone: Safari → Condividi → Aggiungi alla schermata Home.

## Provarla sul PC
```bash
python -m http.server 5070 --directory webapp-demo
```
Poi apri http://localhost:5070.

## Com'è fatta
- `index.html`, `app.css`, `app.js`: interfaccia di base (nessuna libreria esterna); `assistente.js` e `modulo-*.js` aggiungono le funzioni di 1B e 1C. Le regole per scrivere un modulo sono in `MODULI.md`.
- `calcoli.js`: calcoli separati dall'interfaccia (GPX, tramonto, durata, break-even), riusabili nell'app vera.
- `sw.js` e `manifest.webmanifest`: installazione e uso offline. A ogni pubblicazione cambiare `VERSIONE` in `sw.js`.
- `font/`: Outfit e Inter salvati nell'app (licenza SIL OFL), niente chiamate a Google Fonts.
- `icone/`: logo provvisorio, variante B "sole che sorge".

Questa demo non è il codice di produzione: l'app vera seguirà le decisioni della Fase 0 (T02 linguaggio, T03 database, T06 hosting).
