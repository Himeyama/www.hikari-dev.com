interface EraStruct {
    era: string;
    year: number;
    month: number;
    date: number;
    dateObject?: Date;
}

class Wareki {
    static date(dateString: string): string {
        let dateObject: Date = new Date(dateString);
        let year: number = dateObject.getFullYear();
        let month: number = dateObject.getMonth();
        let date: number = dateObject.getDate();

        let eraInfo: EraStruct = this.era(dateObject);
        return `${eraInfo.era} ${year - eraInfo.year + 1} 年 ${month + 1} 月 ${date} 日`;
    }

    static era(date: Date): EraStruct {
        let erasDate: EraStruct[] = [
            { era: "明治", year: 1868, month: 10, date: 23 },
            { era: "大正", year: 1912, month: 7, date: 30 },
            { era: "昭和", year: 1926, month: 12, date: 25 },
            { era: "平成", year: 1989, month: 1, date: 8 },
            { era: "令和", year: 2019, month: 5, date: 1 },
        ];

        let i: number;
        for (i = 0; i < erasDate.length; i++) {
            erasDate[i].dateObject = new Date(
                erasDate[i].year,
                erasDate[i].month - 1,
                erasDate[i].date
            );
        }

        for (i = 0; i < erasDate.length - 1; i++) {
            if ((i != erasDate.length - 1 && erasDate[i].dateObject! <= date && date < erasDate[i + 1].dateObject!)
                || (i == erasDate.length - 1 && erasDate[i].dateObject! <= date)) {
                break;
            }
        }
        return erasDate[i];
    }
}
