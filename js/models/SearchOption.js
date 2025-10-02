export default class Options {
    constructor(dateFrom, dateTo, west, east, south, north, satellites, angle, isNightImage) {
        this.dateFrom = dateFrom || "2024-01-01";
        this.dateTo = dateTo || "2024-01-02";
        this.west = west || 179.356737;
        this.east = east || 79.563306;
        this.south = south || -37.146315;
        this.north = north || -179.766815;
        this.satellites = satellites || [];
        this.angle = angle || 0;
        this.isNightImage = isNightImage;
    }

    print() {
        console.log("Options:");
        console.log("Date from:", this.dateFrom);
        console.log("Date to:", this.dateTo);
        console.log("West:", this.west);
        console.log("East:", this.east);
        console.log("South:", this.south);
        console.log("North:", this.north);
        console.log("Satellites:", this.satellites);
        console.log("Angle:", this.angle);
    }
}
