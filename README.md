# Campo Base · web app demo

Demo installabile su Android (e iPhone) della Fase 1. **Solo dati di esempio**: tutto resta nel browser del telefono, nessun dato va a un server. Non inserire dati reali di partecipanti.

## Cosa si può provare
- **Oggi**: prossima uscita, chi manca, break-even, briefing con tramonto e ora limite calcolati.
- **Uscite**: in programma, bozze, archivio; nuova uscita con **import GPX** (distanza, dislivello, quote); pubblica, concludi, duplica.
- **Scheda uscita**: dati del percorso, link ad Aeronautica Militare e Mapy con registro della consultazione, break-even, spunti con etichetta AI da convalidare.
- **Iscritti**: conferma richieste, dai il posto dalla lista d'attesa, segna la checklist vista, cancella.
- **Messaggi pronti**: promemoria, annuncio, **testo per WhatsApp Eventi**, messaggio del giorno; copia in un tocco.
- **Modo sentiero**: tema scuro ad alto contrasto, presenze, funziona senza rete.
- **Pagina dell'uscita** (vista del partecipante): richiesta di posto senza account, consenso foto facoltativo.
- **Profilo**: titoli dichiarati, scadenzario, ripristino dei dati di esempio.

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
- `index.html`, `app.css`, `app.js`: interfaccia (nessuna libreria esterna).
- `calcoli.js`: calcoli separati dall'interfaccia (GPX, tramonto, durata, break-even), riusabili nell'app vera.
- `sw.js` e `manifest.webmanifest`: installazione e uso offline. A ogni pubblicazione cambiare `VERSIONE` in `sw.js`.
- `font/`: Outfit e Inter salvati nell'app (licenza SIL OFL), niente chiamate a Google Fonts.
- `icone/`: logo provvisorio, variante B "sole che sorge".

Questa demo non è il codice di produzione: l'app vera seguirà le decisioni della Fase 0 (T02 linguaggio, T03 database, T06 hosting).
