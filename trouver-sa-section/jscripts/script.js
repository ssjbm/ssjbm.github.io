const GEOCODER = '';


window.SearchTool = {
    rules: null,
    secrets: null,
    postalcode: null,
    results: null,
    ready: false,


    init: async function () {
        this.results = document.getElementById('searchtool_results');
        this.postalcode = document.getElementById('searchtool_postalcode');
        this.postalcode.addEventListener('input', () => {
            let value = this.postalcode.value.replace(/\s/g, '');
            if (value.length > 3) value = value.slice(0,3) + ' ' + value.slice(3);
            this.postalcode.value = value.toUpperCase();
            if(this.postalcode.checkValidity()) {
                this.searchSection(this.postalcode.value);
            }
        });

        const urls = [root + 'secrets.json', root + 'assets/maps/rules.json'];
        const requests = urls.map(async url => {
            const response = await fetch(url);
            return { url, id: url.match(/([^\/]+)(?=\.\w+$)/)[0], status: response.status, ok: response.ok, data: await response.json()};
        });
        for await (const {url, id, status, ok, data} of requests) {
            if(!ok) console.error(`${id} [${status} - ${ok ? "OK" : "ERREUR"}] ${url}`);
            this[id] = data;
        }

        this.setReady();
    },


    setReady: function() {
        this.ready = true;
        this.postalcode.disabled = false;

        const s=document.createElement('script');
        s.src=`https://maps.googleapis.com/maps/api/js?key=${this.secrets.MAPS_API_KEY}&callback=SearchTool.initMap&v=weekly&loading=async`;
        s.async=true; document.head.appendChild(s);
    },


    initMap: function () {
        this.loadGeneralMap();
    },


    loadGeneralMap: function() {
        const map = new google.maps.Map(document.getElementById('map'), { center: {lat: 45.55, lng: -73.65}, zoom: 7 });
        const layer = new google.maps.Data({ map });

        layer.loadGeoJson(root + '/assets/maps/global-area.geojson', null, (features) => {
            layer.setStyle({ fillOpacity: 0.25, strokeWeight: 1 });

            // Fit aux polygones chargés
            const b = new google.maps.LatLngBounds();
            features.forEach(f => f.getGeometry().forEachLatLng(ll => b.extend(ll)));
            if (!b.isEmpty()) map.fitBounds(b);

            console.log('GeoJSON features:', features.length);
        });
    },



    searchSection: async function(postalcode) {
        const fsa = postalcode.slice(0, 3).toUpperCase();
        const section = this.findSectionByFSA(fsa);
        this.results.innerHTML = `Section ${section.name}`;
    },


    findSectionByFSA: function(fsa) {
        const section = this.rules.sections.find(s => Array.isArray(s.fsa) && s.fsa.includes(fsa));
        return section || this.rules.defaultSection || null;
    },


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

ready(() => { SearchTool.init(); });

