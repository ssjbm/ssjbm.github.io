const GeoCoding = {


    statusMessage: function (status, errorMessage) {
        switch (status) {
            case "ZERO_RESULTS": return "Aucun résultat pour ce code postal.";
            case "OVER_DAILY_LIMIT":
            case "OVER_QUERY_LIMIT": return "Quota dépassé. Vérifiez la facturation/quota sur Google Cloud.";
            case "REQUEST_DENIED": return "Requête refusée. Vérifiez les restrictions de la clé API (HTTP referrer) et l’activation de l’API Geocoding.";
            case "INVALID_REQUEST": return "Requête invalide. Paramètres manquants ou mal formés.";
            case "UNKNOWN_ERROR": return "Erreur inconnue côté Google. Réessayez.";
            default:
                return errorMessage || `Statut inattendu: ${status || "inconnu"}`;
        }
    },


    getGeocode: async function(postalcode, data = null) {
        const key = 'geocoder_' + postalcode.replace(/[^A-Z0-9]/, '').toLowerCase();
        if ((data = localStorage.getItem(key)) !== null) return JSON.parse(data);
        const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
        url.searchParams.set("components", `country:CA|postal_code:${postalcode.replace(/[^A-Z0-9]/g, '')}`);
        url.searchParams.set("language", "fr-CA");
        url.searchParams.set("key", this.secrets.MAPS_API_KEY);

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if(!(data = await res.json())) throw new Error(`Bad request response format.`);
        localStorage.setItem(key, JSON.stringify(data));
        return data;
    },


    wrapData: function(data) {
        const r = data.results[0];
        const joinNonEmpty = (arr) => { return arr.filter(Boolean).join(' '); }
        const codeWrap = (s) => { return s ? `(${s})` : ''; }
        const get = (type, short = false) => { const c = r.address_components.find(c => c.types.includes(type)); return c ? (short ? c.short_name : c.long_name) : ''; };
        const rows = [
            ["postalcode", get("postal_code")],
            ["city", get("locality") || get("sublocality") || get("postal_town")],
            ["neighborhood", get("neighborhood") || get("sublocality")],
            ["state", joinNonEmpty([get("administrative_area_level_1"), codeWrap(get("administrative_area_level_1", true))])],
            ["country", joinNonEmpty([get("country"), codeWrap(get("country", true))])],
            ["address", r.formatted_address],
            ["latitude", r.geometry?.location?.lat ?? ""],
            ["longitude", r.geometry?.location?.lng ?? ""],
            ["place_id", r.place_id]
        ].filter(([,v]) => v && String(v).trim() !== "");
        return Object.fromEntries(rows);
    },

};





function shuffle(array) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}