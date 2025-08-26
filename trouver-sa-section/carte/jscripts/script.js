window.SearchTool = {
    sections: null,
    secrets: null,

    map: null,
    layer: null,
    featureIdx: [],
    colorCodes: [],
    toolbar: null,
    selector: null,
    lastSectionId: null,


    

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
        this.selector.create('option', null, '--- Sélectionner une section ---').value = '';

        this.sections.sections.forEach((s, i) => {
            const opt = this.selector.create('option');
            opt.value = s.id;
            opt.innerText = s.name;
            opt.style.backgroundColor = this.colorCodes[s.id];
        });

        this.selector.addEventListener('change', e => {
            this.setFocus(this.getSelectSection());
        });

        document.getElementById('savesection').create('button', null, 'Sauvegarder la carte').addEventListener('click', e => { this.saveJsonMap(); });

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
        const { ColorScheme, ControlPosition } = await google.maps.importLibrary("core");
        const { Map, Data } = await google.maps.importLibrary("maps");
        this.map = new Map(document.getElementById('resultmap'), {
            center: {lat: 45.55, lng: -73.65}, zoom: 9,
            streetViewControl: false,
            mapTypeControl: false,
            colorScheme: localStorage.getItem('darkmode') === 'true' ? ColorScheme.DARK : ColorScheme.LIGHT,
        });

        this.toolbar = create('div', 'resultmap-toolbar-section-name');
        this.map.controls[ControlPosition.TOP_LEFT].push(this.toolbar);

        this.layer = new Data({ map: this.map });
        this.layer.setStyle({ fillOpacity: 0.10, strokeWeight: 1, strokeColor: '#a74747ff', fillColor: '#000' });
        this.layer.loadGeoJson(root + '/assets/maps/montreal-areas.geojson', null, (features) => {
            this.layer.addListener('rightclick', e => this.clickArea(e.feature));
            this.layer.addListener('click', e => {
                if(e.domEvent.ctrlKey || e.domEvent.metaKey) {
                    this.clickArea(e.feature);
                } else {
                    this.selector.value = e.feature.sectionId ?? '';
                    if(e.feature.sectionId) this.setFocus(e.feature.sectionId);
                }
            });
            
            features.forEach(feature => {
                const areaId = feature.getProperty('IDUGD');
                const section = this.findSectionByAreaId(areaId);
                feature.sectionId = section ? section.id : null;
                feature.oldSectionId = null;
                this.featureIdx[areaId] = feature;
            });
            this.sections.sections.forEach(section => {
                section.areas.forEach(areaId => {
                    this.layer.overrideStyle(this.featureIdx[areaId], { fillColor: this.colorCodes[section.id], strokeColor: this.colorCodes[section.id], fillOpacity: 0.20, strokeWeight: 1 });
                });
            });

        });






        // document.addEventListener("fullscreenchange", e => { this.updateFullscreenLayer(e); });
        // document.addEventListener("webkitfullscreenchange", e => { this.updateFullscreenLayer(e); });

    },


    getSelectSection: function() {
        return this.selector.value || null;
    },


    setFocus: async function(id) {



        if(this.lastSectionId && id != this.lastSectionId) {
            // const section = this.findSectionById(this.lastSectionId);
            this.findSectionById(this.lastSectionId).areas.forEach(areaId => { this.layer.overrideStyle(this.featureIdx[areaId], { fillOpacity: 0.20 }); });
        }
        if(id) {
            const bound = new google.maps.LatLngBounds();
            const section = this.findSectionById(id);
            this.toolbar.style.display = 'block';
            this.toolbar.textContent = "Section " + section.name;
            section.areas.forEach(areaId => {
                this.featureIdx[areaId].getGeometry().forEachLatLng(ll => bound.extend(ll));
                this.layer.overrideStyle(this.featureIdx[areaId], { fillOpacity: 0.50 });
            });
            if (!bound.isEmpty()) this.map.fitBounds(bound);
            
        } else {
            const bound = new google.maps.LatLngBounds();
            this.sections.sections.forEach(section => { section.areas.forEach(areaId => { this.featureIdx[areaId].getGeometry().forEachLatLng(ll => bound.extend(ll)); }); });
            if (!bound.isEmpty()) this.map.fitBounds(bound);
        }
        this.lastSectionId = id;
    },


    clickArea: async function(feature) {
        const sectionId = this.getSelectSection();
        if(!sectionId) return;

        const section = this.findSectionById(sectionId);
        const areaId = feature.getProperty('IDUGD');

        if(feature.sectionId) {
            if(feature.sectionId == sectionId) {
                if(feature.oldSectionId) {
                    const oldSection = this.findSectionById(feature.oldSectionId);
                    oldSection.areas.push(areaId);
                    section.areas = section.areas.filter(x => x !== areaId);
                    feature.sectionId = feature.oldSectionId;
                    feature.oldSectionId = null;
                    this.layer.overrideStyle(feature, { fillColor: this.colorCodes[oldSection.id], strokeColor: this.colorCodes[oldSection.id], fillOpacity: 0.20, strokeWeight: 1 });
                } else {
                    feature.sectionId = null;
                    section.areas = section.areas.filter(x => x !== areaId);
                    this.layer.overrideStyle(feature, { fillOpacity: 0.10, strokeWeight: 1, strokeColor: '#a74747ff', fillColor: '#000' });
                }
            } else {
                const oldSection = this.findSectionById(feature.sectionId);
                oldSection.areas = oldSection.areas.filter(x => x !== areaId);
                section.areas.push(areaId);
                feature.oldSectionId = feature.sectionId;
                feature.sectionId = sectionId;
                this.layer.overrideStyle(feature, { fillColor: this.colorCodes[sectionId], strokeColor: this.colorCodes[sectionId], fillOpacity: 0.50, strokeWeight: 1 });
            }
        } else {
            feature.sectionId = sectionId;
            section.areas.push(areaId);
            this.layer.overrideStyle(feature, { fillColor: this.colorCodes[sectionId], strokeColor: this.colorCodes[sectionId], fillOpacity: 0.50, strokeWeight: 1 });
        }
    },


    // updateFullscreenLayer: function(e) {

    //     const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    //     const fullscreen = (fsEl && this.map.getDiv().contains(fsEl)) || false;

    //     console.log('FS Changed: ' + fullscreen);
    // },


    findSectionByAreaId: function(areaId) {
        const section = this.sections.sections.find(s => Array.isArray(s.areas) && s.areas.includes(areaId));
        return section || null;
    },


    findSectionById: function(id) {
        const section = this.sections.sections.find(s => s.id == id);
        return section || this.sections.defaultSection || null;
    },


    saveJsonMap: function() {
        saveJson(this.sections, 'sections.json');
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