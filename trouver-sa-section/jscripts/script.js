const GEOCODER = '';


window.SearchTool = {
    sections: null,
    secrets: null,
    postalcode: null,
    results: null,
    ready: false,

    map: null,
    layer: null,
    features: {},
    _polyIndex: [],


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

        const urls = [root + 'secrets.json', root + 'assets/maps/sections.json'];
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

        const s = document.createElement('script');
        s.src = `https://maps.googleapis.com/maps/api/js?key=${this.secrets.MAPS_API_KEY}&callback=SearchTool.initMap&v=weekly&loading=async&language=fr&region=CA&libraries=geometry`;
        s.async = true;
        document.head.appendChild(s);
    },


    initMap: function () {
        this.loadGeneralMap();
    },


    loadGeneralMap: async function() {
        const {ColorScheme} = await google.maps.importLibrary("core");
        this.map = new google.maps.Map(document.getElementById('map'), {
            // center: {lat: 45.55, lng: -73.65}, zoom: 7
            colorScheme: localStorage.getItem('darkmode') === 'true' ? ColorScheme.DARK : ColorScheme.LIGHT,
        });

        this.layer = new google.maps.Data({ map: this.map });
        this.layer.loadGeoJson(root + '/assets/maps/sections.geojson', null, (features) => {
            this.layer.setStyle({ fillOpacity: 0.20, strokeWeight: 1 });

            this.layer.addListener('click', e => {
                // console.log(e.feature.getProperty('id'), e.feature.getProperty('name'));
                this.setFocus(e.feature.getProperty('id'));
            });

            // Fit aux polygones chargés
            const b = new google.maps.LatLngBounds();
            features.forEach(f => f.getGeometry().forEachLatLng(ll => b.extend(ll)));
            if (!b.isEmpty()) this.map.fitBounds(b);

            const palette = this.getPalette();
            features.forEach((feature, i) => {
                this.features[feature.getProperty('id')] = feature;
                const c = palette[i % palette.length];
                this.layer.overrideStyle(feature, { fillColor: c, strokeColor: c, fillOpacity: 0.20, strokeWeight: 1 });


    const geoms = this.dataGeomToPolygons(feature.getGeometry()); // -> array<google.maps.Polygon>
    geoms.forEach((poly) => {
      const bounds = new google.maps.LatLngBounds();
      poly.getPaths().forEach(path => path.forEach(ll => bounds.extend(ll)));
      this._polyIndex.push({ feature, poly, bounds });
    });



            });

            // console.log('GeoJSON features:', features.length);
        });
    },


    setFocus: async function(id) {
        const section = this.findSectionById(id);
        this.results.innerHTML = `Section ${section.name}`;


        if (this.features[id] !== undefined) {
            const b = new google.maps.LatLngBounds();
            this.features[id].getGeometry().forEachLatLng(ll => b.extend(ll));
            if (!b.isEmpty()) this.map.fitBounds(b);

            for (const i in this.features) {
                if (this.features.hasOwnProperty(i)) {
                    if(i == id) this.layer.overrideStyle(this.features[i], { fillOpacity: 0.50 });
                    else this.layer.overrideStyle(this.features[i], { fillOpacity: 0.20 });
                }
            }

        } else {
            const b = new google.maps.LatLngBounds();
            for (const i in this.features) {
                if (this.features.hasOwnProperty(i)) {
                    this.features[i].getGeometry().forEachLatLng(ll => b.extend(ll));
                    this.layer.overrideStyle(this.features[i], { fillOpacity: 0.20 });
                }
            }
            if (!b.isEmpty()) this.map.fitBounds(b);
        }


        

    },


    searchSection: async function(postalcode) {

        const results = await this.getGeocode(postalcode);
        if(results.status != 'OK') this.setFocus(this.sections.defaultSection.id);
        else {
            const data = this.wrapData(results);
            const section = this.findSectionByLatLng(data.latitude, data.longitude);
            this.setFocus(section.id);
        }
    },


    findSectionByFSA: function(fsa) {
        const section = this.sections.sections.find(s => Array.isArray(s.fsa) && s.fsa.includes(fsa));
        return section || this.sections.defaultSection || null;
    },


    findSectionById: function(id) {
        const section = this.sections.sections.find(s => s.id == id);
        return section || this.sections.defaultSection || null;
    },


    findSectionByLatLng: function(lat, lng) {
        const feature = this.findContainingFeature({ lat, lng });
        if(!feature) return this.sections.defaultSection || null;
        const id = feature.getProperty('id');
        return this.sections.sections.find(s => s.id == id);
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
        


        fetch('https://script.google.com/macros/s/' + this.secrets.KV_API_KEY + '/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ key: key, value: JSON.stringify(data) }),
        });

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




dataGeomToPolygons: function(geom) {
  const out = [];
  const type = geom.getType(); // 'Polygon' | 'MultiPolygon' | ...
  if (type === 'Polygon') {
    out.push(new google.maps.Polygon({
      // rings: [outer, hole1, hole2, ...]
      paths: geom.getArray().map(ring => ring.getArray())
    }));
  } else if (type === 'MultiPolygon') {
    geom.getArray().forEach(pg => {
      out.push(new google.maps.Polygon({
        paths: pg.getArray().map(ring => ring.getArray())
      }));
    });
  }
  return out;
},


findContainingFeature: function(latLng) {
  for (const {feature, poly, bounds} of this._polyIndex) {
    if (!bounds.contains(latLng)) continue; // rejet rapide
    if (google.maps.geometry.poly.containsLocation(latLng, poly)) {
      return feature; // trouvé !
    }
  }
  return null;
},
















    getPalette: function() {
        return [
            '#ef4444', // red
            '#f97316', // orange
            '#f59e0b', // amber
            '#eab308', // yellow
            '#84cc16', // lime
            '#22c55e', // green
            '#10b981', // emerald
            '#14b8a6', // teal
            '#06b6d4', // cyan
            '#0ea5e9', // sky
            '#3b82f6', // blue
            '#6366f1', // indigo
            '#8b5cf6', // violet
            '#a855f7', // purple
            '#d946ef', // fuchsia
            '#ec4899'  // pink
        ];
    }

};


ready(() => { SearchTool.init(); });