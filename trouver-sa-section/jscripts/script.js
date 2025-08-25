window.SearchTool = {

    sections: null,
    secrets: null,
    postalcode: null,
    results: null,
    infos: null,
    toolbar: null,

    map: null,
    layer: null,
    features: {},
    polyIndex: [],


    init: async function () {
        this.infos = document.getElementById('info');
        this.postalcode = document.getElementById('searchtool_postalcode');
        this.postalcode.addEventListener('input', () => {
            let value = this.postalcode.value.replace(/\s/g, '');
            if (value.length > 3) value = value.slice(0,3) + ' ' + value.slice(3);
            this.postalcode.value = value.toUpperCase();
            if(this.postalcode.checkValidity()) {
                this.searchSection(this.postalcode.value);
            }
        });

        await this.loadJsonProperties([
            root + 'secrets.json',
            root + 'assets/maps/sections.json'
        ]);

        this.loadScript('https://maps.googleapis.com/maps/api/js', {
           key:       this.secrets.MAPS_API_KEY,
           callback:  'SearchTool.initMap',
           libraries: 'geometry',
           loading:   'async',
           language:  'fr',
           region:    'CA',
           v:         'weekly',
        });

    },


    loadJsonProperties: async function(files = []) {
        const requests = files.map(async url => {
            const response = await fetch(url);
            return { url, id: url.match(/([^\/]+)(?=\.\w+$)/)[0], status: response.status, ok: response.ok, data: await response.json()};
        });
        for await (const {url, id, status, ok, data} of requests) {
            if(!ok) console.error(`${id} [${status} - ${ok ? "OK" : "ERREUR"}] ${url}`);
            this[id] = data;
        }
    },


    loadScript: async function(endpoint, params = {}) {
        const url = new URL(endpoint);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const script = document.createElement('script');
        script.src = url.toString();
        script.async = true;
        document.head.appendChild(script);
    },


    initMap: async function() {
        const { ColorScheme, ControlPosition } = await google.maps.importLibrary("core");
        this.map = new google.maps.Map(document.getElementById('map'), {
            streetViewControl: false,
            mapTypeControl: false,
            colorScheme: localStorage.getItem('darkmode') === 'true' ? ColorScheme.DARK : ColorScheme.LIGHT,
        });

        this.toolbar = create('div', 'resultmap-toolbar-section-name');
        this.map.controls[ControlPosition.TOP_LEFT].push(this.toolbar);

        this.layer = new google.maps.Data({ map: this.map });
        this.layer.loadGeoJson(root + '/assets/maps/sections.geojson', null, async (features) => {
            this.layer.addListener('click', e => { this.setFocus(e.feature.getProperty('id')); });

            // Fit aux polygones chargés
            const b = new google.maps.LatLngBounds();
            features.forEach(f => f.getGeometry().forEachLatLng(ll => b.extend(ll)));
            if (!b.isEmpty()) this.map.fitBounds(b);

            const palette = this.getPalette(true);
            features.forEach((feature, i) => {

                this.features[feature.getProperty('id')] = feature;
                const c = palette[this.findSectionById(feature.getProperty('id')).color % palette.length];
                this.layer.overrideStyle(feature, { fillColor: c, strokeColor: c, fillOpacity: 0.20, strokeWeight: 2 });

                const geoms = this.dataGeomToPolygons(feature.getGeometry());
                geoms.forEach((poly) => {
                    const bounds = new google.maps.LatLngBounds();
                    poly.getPaths().forEach(path => path.forEach(ll => bounds.extend(ll)));
                    this.polyIndex.push({ feature, poly, bounds });
                });

            });

            this.postalcode.disabled = false;

            if("geolocation" in navigator) {
                try {
                    const s = await (navigator.permissions?.query({ name: 'geolocation' }));
                    if(s.state !== 'denied') {
                        navigator.geolocation.getCurrentPosition(pos => {
                            this.setFocus(this.findSectionByLatLng(pos.coords.latitude, pos.coords.longitude).id);
                        }, null, { enableHighAccuracy: true });
                    }
                } catch(e) { console.error(e); }
            }
        });
    },


    setFocus: async function(id) {
        const section = this.findSectionById(id);
        this.toolbar.textContent = "Section " + section.name;
        this.toolbar.style.display = 'block';

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

        const infos = Object.fromEntries(Object.entries(section.infos).map(([k, v]) => [k, v.join(', ')]));
        let html = `<table class="section_results"><thead><tr><th colspan="2">Section ${section.name}</th></tr><thead><tbody>`;
            html += `<tr><td>Président :</td><td>${infos.president || '&nbsp;'}</td></tr>`;
            html += `<tr><td>Vice-président :</td><td>${infos.vice_president || '&nbsp;'}</td></tr>`;
            html += `<tr><td>Secrétaire :</td><td>${infos.secretaire || '&nbsp;'}</td></tr>`;
            html += `<tr><td>Trésorier :</td><td>${infos.tresorier || '&nbsp;'}</td></tr>`;
            html += `<tr><td>Conseiller jeunesse :</td><td>${infos.conseiller_jeunesse || '&nbsp;'}</td></tr>`;
            html += `<tr><td>Conseillers :</td><td>${infos.conseillers || '&nbsp;'}</td></tr>`;
            html += `<tr><td>Contact :</td><td><a href="mailto:${section.email}">${section.email}</a></td></tr>`;
            html += `</tbody></table>`;
        this.infos.innerHTML = html;
    },


    searchSection: async function(postalcode) {
        const easySection = this.findSectionByPostalCode(postalcode);
        if(easySection) this.setFocus(easySection.id);
        else {
            const results = await this.getGeocode(postalcode);
            if(results.status != 'OK') {
                this.setFocus(this.sections.defaultSection.id);
                console.error(this.statusMessage(results.status));
            }
            else {
                const location = results.results[0].geometry.location;
                const section = this.findSectionByLatLng(location.lat, location.lng);
                this.setFocus(section.id);
            }
        }
    },


    findSectionByPostalCode: function(postalcode) {
        postalcode = postalcode.trim().replace(/^([A-Z][0-9][A-Z])\s?([0-9][A-Z][0-9][A-Z][0-9])$/i, '$1 $2').toUpperCase();
        if(this.sections.defaultSection.postalcodes.includes(postalcode)) return this.sections.defaultSection;
        let section = this.sections.sections.find(s => Array.isArray(s.postalcodes) && s.postalcodes.includes(postalcode));
        return section || null;
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


    dataGeomToPolygons: function (geom) {
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


    findContainingFeature: function (latLng) {
        for (const { feature, poly, bounds } of this.polyIndex) {
            if (!bounds.contains(latLng)) continue; // rejet rapide
            if (google.maps.geometry.poly.containsLocation(latLng, poly)) {
                return feature; // trouvé !
            }
        }
        return null;
    },


    getPalette: function(full = false) {
        if(localStorage.getItem('darkmode') === 'true') {
            if(full) return [
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
            else return [
                '#ef4444', // red
                '#f59e0b', // amber
                '#84cc16', // lime
                '#10b981', // emerald
                '#06b6d4', // cyan
                '#3b82f6', // blue
                '#8b5cf6', // violet
                '#ec4899'  // pink
            ];
        } else {
            if(full) return [
                '#b91c1c', // red-700
                '#c2410c', // orange-700
                '#b45309', // amber-700
                '#854d0e', // yellow-800 (jaune plus foncé = lisible)
                '#4d7c0f', // lime-700
                '#15803d', // green-700
                '#047857', // emerald-700
                '#0f766e', // teal-700
                '#0e7490', // cyan-700
                '#0369a1', // sky-700
                '#1d4ed8', // blue-700
                '#4338ca', // indigo-700
                '#6d28d9', // violet-700
                '#7e22ce', // purple-700
                '#a21caf', // fuchsia-700
                '#be185d'  // pink-700
            ];
            else return [
                '#b91c1c', // red-700
                '#b45309', // amber-700
                '#4d7c0f', // lime-700
                '#047857', // emerald-700
                '#0e7490', // cyan-700
                '#1d4ed8', // blue-700
                '#6d28d9', // violet-700
                '#be185d'  // pink-700
            ];

        }
    },


};


ready(() => { SearchTool.init(); });