const GEOCODER = '';


window.SearchTool = {
    sections: null,
    secrets: null,

    map: null,
    layer: null,
    // features: {},
    featureIdx: [],
    colorCodes: [],
    selector: null,

    

    init: async function () {

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
        const palette = this.getPalette(true);
        this.sections.sections.forEach(s => this.colorCodes[s.id] = palette[s.color]);
        this.selector = document.getElementById('sectionselector').create('select');
 
        this.selector.create('option', null, '--- Sélectionner une section ---');

        this.sections.sections.forEach((s, i) => {
            const opt = this.selector.create('option');
            opt.value = s.id;
            opt.innerText = s.name;
            opt.style.backgroundColor = this.colorCodes[s.id];
        });

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


    loadScript: async function(endpoint, params = {}) {
        const url = new URL(endpoint);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const script = document.createElement('script');
        script.src = url.toString();
        script.async = true;
        document.head.appendChild(script);
    },


    initMap: async function() {
        const {ColorScheme} = await google.maps.importLibrary("core");
        this.map = new google.maps.Map(document.getElementById('resultmap'), {
            center: {lat: 45.55, lng: -73.65}, zoom: 9,
            streetViewControl: false,
            mapTypeControl: false,
            colorScheme: localStorage.getItem('darkmode') === 'true' ? ColorScheme.DARK : ColorScheme.LIGHT,
        });

        this.layer = new google.maps.Data({ map: this.map });
        this.layer.setStyle({ fillOpacity: 0.10, strokeWeight: 1, strokeColor: '#a74747ff', fillColor: '#000' });
        this.layer.loadGeoJson(root + '/assets/maps/montreal-areas.geojson', null, (features) => {
            

            this.layer.addListener('click', e => {
                // console.log(e.feature.getProperty('id'), e.feature.getProperty('name'));
                // this.setFocus(e.feature.getProperty('RTACIDU'));
            });

            // console.log(this.sections.sections[0]);

            features.forEach(f => {
                // console.log(f.getProperty('IDUGD'));

                // console.log(typeof f.getProperty('IDUGD'));
                const section = this.findSectionByAreaId(f.getProperty('IDUGD'));
                if(section) {
                    // console.log(section.id);
                    // f.title = section.name;
                    this.layer.overrideStyle(f, { fillColor: this.colorCodes[section.id], strokeColor: this.colorCodes[section.id], fillOpacity: 0.20, strokeWeight: 1 });
                } else {
                    // this.layer.overrideStyle(f, { fillOpacity: 0.20, strokeWeight: 1, strokeColor: '#a74747ff', fillColor: '#000' });
                }


            });


            // Fit aux polygones chargés
            // const b = new google.maps.LatLngBounds();
            // features.forEach(f => f.getGeometry().forEachLatLng(ll => b.extend(ll)));
            // if (!b.isEmpty()) this.map.fitBounds(b);

            // const palette = this.getPalette();
            // features.forEach((f, i) => {
            //     this.features[f.getProperty('RTACIDU')] = f;
            // //     const c = palette[i % palette.length];
            // //     this.layer.overrideStyle(f, { fillColor: c, strokeColor: c, fillOpacity: 0.40, strokeWeight: 1 });
            // });
            
            // const palette = this.getPalette();
            // this.sections.sections.forEach((section, i) => {
            //     const c = palette[i % palette.length];
            //     section.fsa.forEach(fsa => {
            //         this.layer.overrideStyle(this.features[fsa], { fillColor: c, strokeColor: c, fillOpacity: 0.20, strokeWeight: 1 });
            //     });
            // });

            // console.log('GeoJSON features:', features.length);
        });
    },


    setFocus: async function(id) {
        const section = this.findSectionById(id);
        // this.results.innerHTML = `Section ${section.name}`;
console.log(id);

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


    findSectionByAreaId: function(areaId) {

        // this.sections.sections.forEach(s => {
        //     if(s.areas.includes(areaId)) console.log('yes');
        // });


        const section = this.sections.sections.find(s => Array.isArray(s.areas) && s.areas.includes(areaId));
        return section || null;
    },


    findSectionByFSA: function(fsa) {
        const section = this.sections.sections.find(s => Array.isArray(s.fsa) && s.fsa.includes(fsa));
        return section || this.sections.defaultSection || null;
    },


    findSectionById: function(id) {
        const section = this.sections.sections.find(s => s.id == id);
        return section || this.sections.defaultSection || null;
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