// Calcoli di dominio, separati dall'interfaccia: si riusano nell'app vera e in quella per gli store.
// Nessun numero tecnico viene dall'AI: tutto arriva dal GPX o dalla scheda compilata dal leader.
"use strict";

const Calcoli = (() => {
  const RAD = Math.PI / 180;

  // Tramonto con l'equazione solare (precisione di qualche minuto, sufficiente per il briefing).
  function tramonto(data, lat, lon) {
    const mezzogiorno = new Date(data.getFullYear(), data.getMonth(), data.getDate(), 12);
    const giornoGiuliano = mezzogiorno.getTime() / 86400000 + 2440587.5;
    const n = Math.round(giornoGiuliano - 2451545.0 + 0.0008);
    const jStella = n - lon / 360;
    const M = (357.5291 + 0.98560028 * jStella) % 360;
    const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
    const lambda = (M + C + 180 + 102.9372) % 360;
    const jTransito = 2451545 + jStella + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD);
    const sinDelta = Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD);
    const cosDelta = Math.cos(Math.asin(sinDelta));
    const cosOmega = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * sinDelta) / (Math.cos(lat * RAD) * cosDelta);
    if (cosOmega < -1 || cosOmega > 1) return null; // sole di mezzanotte o notte polare
    const jTramonto = jTransito + Math.acos(cosOmega) / RAD / 360;
    return new Date((jTramonto - 2440587.5) * 86400000);
  }

  // Stima della durata di cammino: 4 km/h in piano più 1 ora ogni 400 m di salita. Il leader la può correggere.
  function durataStimataOre(km, dislivello) {
    return km / 4 + dislivello / 400;
  }

  function oraLimiteRientro(tramontoData, margineMinuti) {
    return tramontoData ? new Date(tramontoData.getTime() - margineMinuti * 60000) : null;
  }

  // Break-even dell'uscita (F61): solo ricavi previsti e spese inserite dal leader, nessun incasso registrato.
  function breakEven(prezzo, confermati, spese) {
    const totaleSpese = spese.reduce((s, v) => s + (Number(v.importo) || 0), 0);
    const ricavi = prezzo * confermati;
    const pareggio = prezzo > 0 ? Math.ceil(totaleSpese / prezzo) : Infinity;
    return { totaleSpese, ricavi, margine: ricavi - totaleSpese, pareggio, mancano: Math.max(0, pareggio - confermati) };
  }

  function distanzaMetri(a, b) {
    const R = 6371000;
    const dLat = (b.lat - a.lat) * RAD, dLon = (b.lon - a.lon) * RAD;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // Legge un GPX e tiene solo i numeri. Nome, autore e orari della traccia non vengono salvati.
  function analizzaGPX(testo) {
    const doc = new DOMParser().parseFromString(testo, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("Il file non è un GPX valido: controlla di aver esportato la traccia in formato GPX.");
    const nodi = [...doc.querySelectorAll("trkpt, rtept")];
    if (nodi.length < 2) throw new Error("Il file GPX non contiene una traccia con almeno due punti.");
    const punti = nodi.map((p) => ({
      lat: parseFloat(p.getAttribute("lat")),
      lon: parseFloat(p.getAttribute("lon")),
      ele: parseFloat(p.querySelector("ele")?.textContent),
    })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
    if (punti.length < 2) throw new Error("I punti della traccia non hanno coordinate valide.");

    let metri = 0, salita = 0, quotaMax = -Infinity, quotaMin = Infinity, rif = null;
    for (let i = 0; i < punti.length; i++) {
      if (i > 0) metri += distanzaMetri(punti[i - 1], punti[i]);
      const e = punti[i].ele;
      if (Number.isFinite(e)) {
        quotaMax = Math.max(quotaMax, e); quotaMin = Math.min(quotaMin, e);
        // Soglia di 3 m per non sommare il rumore del GPS al dislivello.
        if (rif === null) rif = e;
        else if (e - rif >= 3) { salita += e - rif; rif = e; }
        else if (rif - e >= 3) rif = e;
      }
    }
    return {
      km: Math.round(metri / 100) / 10,
      dislivello: Math.round(salita),
      quotaMax: Number.isFinite(quotaMax) ? Math.round(quotaMax) : null,
      quotaMin: Number.isFinite(quotaMin) ? Math.round(quotaMin) : null,
      partenza: { lat: punti[0].lat, lon: punti[0].lon },
      punti: punti.length,
    };
  }

  const ora = (d) => d ? d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "—";
  const durata = (ore) => `${Math.floor(ore)} h ${String(Math.round((ore % 1) * 60)).padStart(2, "0")}`;
  const euro = (v) => v.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const numero = (v) => v.toLocaleString("it-IT");

  return { tramonto, durataStimataOre, oraLimiteRientro, breakEven, analizzaGPX, ora, durata, euro, numero };
})();
