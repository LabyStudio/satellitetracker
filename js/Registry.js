// https://celestrak.com/satcat/tle.php?CATNR=25544
// https://celestrak.com/pub/TLE/catalog.txt

let satellites = [];

class SatelliteRegistry {
    databaseFile;
    database = [];

    constructor(databaseFile) {
        this.databaseFile = databaseFile;
    }

    /**
     * Load all TLE data from celestrak
     */
    loadAll(callback) {
        let scope = this;
        $.get(this.databaseFile, function (data) {
            let lines = data.split("\n");

            // Load TLE's
            for (let i = 0; i < lines.length; i += 3) {

                // TLE format
                let name = lines[i];
                let line1 = lines[i + 1];
                let line2 = lines[i + 2];

                scope.database[name] = [name, line1, line2];
            }

            callback();
        });
    }

    getTLE(name) {
        return this.database[name];
    }

    /**
     * Load tle data from cache
     * @param id
     * @param callback
     */
    loadLocalTLE(id, callback) {
        $.get("assets/tle/" + id + ".txt", function (data) {
            callback(data.split("\n"));
        });
    }

    setSatelliteSpawnEnvironment(earthGroup, foreground) {
        this.earthGroup = earthGroup;
        this.foreground = foreground;
    }

    spawnSatellite(satellite) {
        satellite.addModels(this.earthGroup, this.foreground);
        satellites.push(satellite);
    }

}