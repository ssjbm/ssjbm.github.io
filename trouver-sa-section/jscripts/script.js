const SearchTool = {

    postalcode: null,

    init: async function (data = {}) {
        this.postalcode = document.getElementById('searchtool_postalcode');
        this.postalcode.addEventListener('input', () => {
            let value = this.postalcode.value.replace(/\s/g, '');
            if (value.length > 3) value = value.slice(0,3) + ' ' + value.slice(3);
            this.postalcode.value = value.toUpperCase();
            if(this.postalcode.checkValidity()) {
                this.searchSection(this.postalcode.value);
            }
        });
    },

    searchSection: async function(postalcode) {
        console.log('Rechercher: ' + postalcode);
    },

};

