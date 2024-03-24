class I18n{
    static data = {
        "en": {
            "notepad": "Notepad",
            "hikarinote": "Hikari Note",
            "menu": "Menu",
            "save": "Save",
            "clear": "Clear",
            "search": "Search",
            "archive": "Archive",
            "tags": "Tags",
            "editor": "Notepad",
            "copyright": "Copyright of Hikari Note belongs to Hikari."
        }
    };

    constructor(){

    }

    static i18n = (lang) => {
        const allSelector = document.querySelectorAll("*");
        allSelector.forEach(element => {
            // const className = element.className;
            // const match = className.match(/^i18n-(.*?)$/);
            const i18nTag = Array.from(element.classList).map(e => {const m = e.match(/^i18n-(.*?)$/); if(m){return m[1]}; return null;}).filter(e => e)[0]
            if(i18nTag){
                element.textContent = this.data[lang][i18nTag];
            }
        });
    }
}
