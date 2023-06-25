var Wareki = /** @class */ (function () {
    function Wareki() {
    }
    Wareki.date = function (dateString) {
        var dateObject = new Date(dateString);
        var year = dateObject.getFullYear();
        var month = dateObject.getMonth();
        var date = dateObject.getDate();
        var eraInfo = this.era(dateObject);
        return "".concat(eraInfo.era, " ").concat(year - eraInfo.year + 1, " \u5E74 ").concat(month + 1, " \u6708 ").concat(date, " \u65E5");
    };
    Wareki.era = function (date) {
        var erasDate = [
            { era: "明治", year: 1868, month: 10, date: 23 },
            { era: "大正", year: 1912, month: 7, date: 30 },
            { era: "昭和", year: 1926, month: 12, date: 25 },
            { era: "平成", year: 1989, month: 1, date: 8 },
            { era: "令和", year: 2019, month: 5, date: 1 },
        ];
        var i;
        for (i = 0; i < erasDate.length; i++) {
            erasDate[i].dateObject = new Date(erasDate[i].year, erasDate[i].month - 1, erasDate[i].date);
        }
        for (i = 0; i < erasDate.length - 1; i++) {
            if ((i != erasDate.length - 1 && erasDate[i].dateObject <= date && date < erasDate[i + 1].dateObject)
                || (i == erasDate.length - 1 && erasDate[i].dateObject <= date)) {
                break;
            }
        }
        return erasDate[i];
    };
    return Wareki;
}());
