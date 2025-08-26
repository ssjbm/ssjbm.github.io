window.SearchTool = {
    sections: null,
    palettes: null,
    secrets: null,

    map: null,
    layer: null,
    featureIdx: [],
    colorCodes: [],
    toolbar: null,
    lastSectionId: null,

    defaultStroke: '#a74747ff',
    defaultFill:   '#000000',


    init: async function () {
        await loadJsonProperties(this, [
            `${root}secrets.json`,
            `${root}assets/maps/sections.json`,
            `${root}assets/maps/palettes.json`
        ]);

        loadScript('https://maps.googleapis.com/maps/api/js', {
           key:       this.secrets.MAPS_API_KEY,
           callback:  'SearchTool.initMap',
           libraries: 'geometry',
           loading:   'async',
           language:  'fr',
           region:    'CA',
           v:         'weekly',
        }, true);        

        this.initFields();
    },


    initFields: async function() {        
        const palette = this.getPalette(true);
        this.sections.sections.forEach(s => this.colorCodes[s.id] = palette[s.color % palette.length]);
        document.getElementById('savesection').create('button', null, 'Sauvegarder la carte').addEventListener('click', e => this.saveJsonMap());
        setTimeout(() => $app.registerLightSwitch(this), 1);
    },


    initMap: async function() {
        const { ColorScheme, ControlPosition } = await google.maps.importLibrary("core");
        const { Map, Data } = await google.maps.importLibrary("maps");
        this.map = new Map(document.getElementById('resultmap'), {
            colorScheme: localStorage.getItem('darkmode') === 'true' ? ColorScheme.DARK : ColorScheme.LIGHT,
            center: { lat: 45.55, lng: -73.65 },
            streetViewControl: false,
            mapTypeControl: false,
            zoom: 9
        });

        this.toolbar = create('div', 'resultmap-toolbar-section-name');
        this.map.controls[ControlPosition.TOP_LEFT].push(this.toolbar);

        this.layer = new Data({ map: this.map });
        this.layer.setStyle({ fillOpacity: 0.10, strokeWeight: 1, strokeColor: this.defaultStroke, fillColor: this.defaultFill });
        this.layer.loadGeoJson(`${root}assets/maps/montreal-areas.geojson`, null, (features) => {
            this.layer.addListener('rightclick', e => this.clickArea(e.feature));
            this.layer.addListener('click', e => {
                if(e.domEvent.ctrlKey || e.domEvent.metaKey) this.clickArea(e.feature);
                else if(e.feature.sectionId && this.lastSectionId != e.feature.sectionId) this.setFocus(e.feature.sectionId);
            });
            
            features.forEach(feature => {
                const areaId = feature.getProperty('IDUGD');
                const section = this.findSectionByAreaId(areaId);
                feature.sectionId = section ? section.id : null;
                feature.oldSectionId = null;
                this.featureIdx[areaId] = feature;
            });
            
            this.sections.sections.forEach(section => section.areas.forEach(areaId => {
                this.layer.overrideStyle(this.featureIdx[areaId], {
                    fillColor: this.colorCodes[section.id],
                    strokeColor: this.colorCodes[section.id],
                    strokeWeight: 1,
                    fillOpacity: 0.20
                });
            }));

        });

    },


    setFocus: async function(id) {
        const bound = new google.maps.LatLngBounds();
        if(this.lastSectionId && id != this.lastSectionId)
            this.findSectionById(this.lastSectionId).areas.forEach(areaId => this.layer.overrideStyle(this.featureIdx[areaId], { fillOpacity: 0.20 }));
        if(id) {
            const section = this.findSectionById(id);
            this.toolbar.style.display = 'block';
            this.toolbar.textContent = `Section ${section.name}`;
            section.areas.forEach(areaId => {
                this.featureIdx[areaId].getGeometry().forEachLatLng(ll => bound.extend(ll));
                this.layer.overrideStyle(this.featureIdx[areaId], { fillOpacity: 0.50 });
            });
        } else {
            this.sections.sections.forEach(section => section.areas.forEach(areaId => this.featureIdx[areaId].getGeometry().forEachLatLng(latlng => bound.extend(latlng))));
        }
        if(!bound.isEmpty()) this.map.fitBounds(bound);
        this.lastSectionId = id;
    },


    clickArea: async function(feature) {
        const sectionId = this.lastSectionId;
        const color = this.colorCodes[sectionId];
        if(!sectionId) return;

        const section = this.findSectionById(sectionId);
        const areaId = feature.getProperty('IDUGD');

        if(feature.sectionId) {
            if(feature.sectionId == sectionId) {
                if(feature.oldSectionId) {
                    const oldSection = this.findSectionById(feature.oldSectionId);
                    const oldColor = this.colorCodes[oldSection.id];
                    oldSection.areas.push(areaId);
                    section.areas = section.areas.filter(x => x !== areaId);
                    feature.sectionId = feature.oldSectionId;
                    feature.oldSectionId = null;
                    this.layer.overrideStyle(feature, { fillColor: oldColor, strokeColor: oldColor, fillOpacity: 0.20, strokeWeight: 1 });
                } else {
                    feature.sectionId = null;
                    section.areas = section.areas.filter(x => x !== areaId);
                    this.layer.overrideStyle(feature, { fillOpacity: 0.10, strokeWeight: 1, strokeColor: this.defaultStroke, fillColor: this.defaultFill });
                }
            } else {
                const oldSection = this.findSectionById(feature.sectionId);
                oldSection.areas = oldSection.areas.filter(x => x !== areaId);
                section.areas.push(areaId);
                feature.oldSectionId = feature.sectionId;
                feature.sectionId = sectionId;
                this.layer.overrideStyle(feature, { fillColor: color, strokeColor: color, fillOpacity: 0.50, strokeWeight: 1 });
            }
        } else {
            feature.sectionId = sectionId;
            section.areas.push(areaId);
            this.layer.overrideStyle(feature, { fillColor: color, strokeColor: color, fillOpacity: 0.50, strokeWeight: 1 });
        }
    },


    findSectionByAreaId: function(areaId) {
        const section = this.sections.sections.find(s => Array.isArray(s.areas) && s.areas.includes(areaId));
        return section || null;
    },


    findSectionById: function(id) {
        const section = this.sections.sections.find(section => section.id == id);
        return section || this.sections.defaultSection || null;
    },


    saveJsonMap: async function() {
        saveJson(this.sections, 'sections.json');
    },


    getPalette: function(full = false) {
        return this.palettes
            [localStorage.getItem('darkmode') === 'true' ? 'dark' : 'light']
            [full ? 'full' : 'partial'];
    },


    lightSwitchOn: function() { location.reload(); },
    lightSwitchOff: function() { location.reload(); },

};


ready(() => { SearchTool.init(); });