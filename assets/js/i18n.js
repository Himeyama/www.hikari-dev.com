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
            "copyright": "Copyright of Hikari Note belongs to Hikari.",
            "settings": "Settings",
            "set-language": "Set a Language",
            "set-english": "Set to English"
        },
        "ja": {
            "notepad": "メモ帳",
            "hikarinote": "ひかりの備忘録",
            "menu": "メニュー",
            "save": "保存",
            "clear": "消去",
            "search": "検索",
            "archive": "書庫",
            "tags": "種別",
            "editor": "エディタ",
            "copyright": "ひかりの備忘録の著作権はひかりに属します",
            "settings": "設定",
            "set-language": "言語の設定",
            "set-english": "表示言語を英語に設定します"
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
