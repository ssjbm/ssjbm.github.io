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
        s.src = `https://maps.googleapis.com/maps/api/js?key=${this.secrets.MAPS_API_KEY}&callback=SearchTool.initMap&v=weekly&loading=async`;
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
            features.forEach((f, i) => {
                this.features[f.getProperty('id')] = f;
                const c = palette[i % palette.length];
                this.layer.overrideStyle(f, { fillColor: c, strokeColor: c, fillOpacity: 0.40, strokeWeight: 1 });
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
        const fsa = postalcode.slice(0, 3).toUpperCase();
        const section = this.findSectionByFSA(fsa);
        this.setFocus(section.id);
    },


    findSectionByFSA: function(fsa) {
        const section = this.sections.sections.find(s => Array.isArray(s.fsa) && s.fsa.includes(fsa));
        return section || this.sections.defaultSection || null;
    },


    findSectionById: function(id) {
        const section = this.sections.sections.find(s => s.id == id);
        return section || this.sections.defaultSection || null;
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