window.SearchTool = {

    sections: null,
    secrets: null,
    postalcode: null,
    results: null,
    ready: false,

    map: null,
    layer: null,
    features: {},
    polyIndex: [],


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
        const { ColorScheme } = await google.maps.importLibrary("core");
        this.map = new google.maps.Map(document.getElementById('map'), {
            // center: {lat: 45.55, lng: -73.65}, zoom: 7
            colorScheme: localStorage.getItem('darkmode') === 'true' ? ColorScheme.DARK : ColorScheme.LIGHT,
        });

        this.layer = new google.maps.Data({ map: this.map });
        this.layer.loadGeoJson(root + '/assets/maps/sections.geojson', null, (features) => {
            this.layer.setStyle({ fillOpacity: 0.20, strokeWeight: 2 });

            this.layer.addListener('click', e => {
                this.setFocus(e.feature.getProperty('id'));
            });

            // Fit aux polygones chargés
            const b = new google.maps.LatLngBounds();
            features.forEach(f => f.getGeometry().forEachLatLng(ll => b.extend(ll)));
            if (!b.isEmpty()) this.map.fitBounds(b);

            // const palette = this.getPalette().map(v => [Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(([,v])=>v);
            const palette = this.getPalette();
            features.forEach((feature, i) => {
                this.features[feature.getProperty('id')] = feature;
                const c = palette[i % palette.length];
                this.layer.overrideStyle(feature, { fillColor: c, strokeColor: c, fillOpacity: 0.20, strokeWeight: 2 });

                const geoms = this.dataGeomToPolygons(feature.getGeometry()); // -> array<google.maps.Polygon>
                geoms.forEach((poly) => {
                    const bounds = new google.maps.LatLngBounds();
                    poly.getPaths().forEach(path => path.forEach(ll => bounds.extend(ll)));
                    this.polyIndex.push({ feature, poly, bounds });
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




            console.log(section);
            // const { InfoWindow } = await google.maps.importLibrary("maps");
            // // Contenu du popup
            // const infoWindow = new InfoWindow({
            // content: "<div style='font-size:14px'><b>Salut 👋</b><br>Voici mon popup</div>",
            // position: section.bounds.center
            // });

            // infoWindow.open(this.map);


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
        const easySection = this.findSectionByPostalCode(postalcode);
        if(easySection) this.setFocus(easySection.id);
        else {
            const results = await this.getGeocode(postalcode);
            if(results.status != 'OK') this.setFocus(this.sections.defaultSection.id);
            else {
                const data = this.wrapData(results);
                const section = this.findSectionByLatLng(data.latitude, data.longitude);
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


    getPalette: function() {
        if(localStorage.getItem('darkmode') === 'true') {
            return this.spreadPalette([
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
            ]);
        } else {
            return this.spreadPalette([
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
            ]);

        }
    },


    // Reçoit: array de hex (#rrggbb ou #rgb). Retourne une NOUVELLE liste réordonnée.
    spreadPalette: function (colors) {
        if (!Array.isArray(colors) || colors.length < 3) return colors?.slice?.() ?? colors;

        // --- Helpers couleurs ---
        const hexToRgb = (hex) => {
            let h = String(hex).replace(/^#/, '').trim();
            if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
            const n = parseInt(h, 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        };
        const rgbToLab = ([r, g, b]) => {
            // sRGB -> lin
            r /= 255; g /= 255; b /= 255;
            const lin = v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            r = lin(r); g = lin(g); b = lin(b);
            // linRGB -> XYZ (D65)
            const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
            const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
            const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
            // XYZ -> Lab
            const xn = 0.95047, yn = 1.00000, zn = 1.08883, eps = 216 / 24389, k = 24389 / 27;
            const f = t => t > eps ? Math.cbrt(t) : (k * t + 16) / 116;
            const fx = f(x / xn), fy = f(y / yn), fz = f(z / zn);
            return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]; // [L,a,b]
        };
        const lab = colors.map(c => ({ c, lab: rgbToLab(hexToRgb(c)) }));

        // Distances (Lab) au carré (pas de sqrt, on compare seulement)
        const n = lab.length;
        const D = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            const [L1, a1, b1] = lab[i].lab, [L2, a2, b2] = lab[j].lab;
            const d = (L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2;
            D[i][j] = D[j][i] = d;
        }

        // Démarre avec la paire la plus éloignée
        let a = 0, b = 1, maxd = -1;
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            if (D[i][j] > maxd) { maxd = D[i][j]; a = i; b = j; }
        }
        const order = [a, b];
        const remaining = new Set([...Array(n).keys()].filter(k => k !== a && k !== b));

        // Insertion gloutonne: à chaque étape, on place la couleur k dans l’intervalle
        // (i -> i+1) qui maximise min( d(k,i), d(k,i+1) ), en considérant l’ordre circulaire.
        while (remaining.size) {
            let bestK = null, bestPos = 0, bestScore = -1;
            for (const k of remaining) {
                const m = order.length;
                for (let i = 0; i < m; i++) {
                    const j = (i + 1) % m;
                    const s = Math.min(D[k][order[i]], D[k][order[j]]);
                    if (s > bestScore) { bestScore = s; bestK = k; bestPos = j; }
                }
            }
            order.splice(bestPos, 0, bestK);
            remaining.delete(bestK);
        }

        // Retourne la palette réordonnée
        return order.map(i => lab[i].c);
    },


};


ready(() => { SearchTool.init(); });