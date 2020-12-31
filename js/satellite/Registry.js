// https://celestrak.com/satcat/tle.php?CATNR=25544
// https://celestrak.com/pub/TLE/catalog.txt

window.SatelliteRegistry = class {
    constructor(satelliteTracker, databaseFile) {
        this.satelliteTracker = satelliteTracker;
        this.databaseFile = databaseFile;
        this.database = [];
        this.satellites = [];
    }

    /**
     * Load all TLE data from celestrak
     */
    loadAll(callback) {
        let scope = this;
        $.get(this.databaseFile, function (data) {
            scope.extractTLE(data, function (name, id, tle) {
                scope.database[id] = tle;
            });

            callback();
        });
    }

    getTLE(id) {
        return this.database[parseInt(id)];
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

    spawnSatellite(satellite, save = true) {
        satellite.addModels(this.earthGroup, this.foreground);
        this.satellites.push(satellite);

        if (save) {
            this.saveUserCatalog();
        }
    }

    destroySatellite(satelliteToDestroy) {
        // Remove satellite from list
        let newSatellites = [];
        Object.values(this.satellites).forEach(satellite => {
            if (satellite !== satelliteToDestroy) {
                newSatellites.push(satellite);
            }
        });
        this.satellites = newSatellites;

        // Destroy models from scene
        satelliteToDestroy.destroyModels(this.earthGroup, this.foreground);

        // New focused satellite
        if (this.satelliteTracker.focusedSatellite === satelliteToDestroy) {
            this.satelliteTracker.setFocusedSatellite(this.satellites[0]);
        }

        this.saveUserCatalog();
    }

    // Store catalog
    saveUserCatalog() {
        let catalog = "";
        Object.values(this.satellites).forEach(satellite => {
            if (parseInt(satellite.id) !== ISS.ID) {
                Object.values(satellite.tle).forEach(line => {
                    catalog += line + "\n";
                });
            }
        });
        this.setCookie("catalog", encodeURIComponent(catalog), 365 * 10);
    }

    loadUserCatalog() {
        let scope = this;
        let data = this.getCookie("catalog");
        if (data != null) {
            this.extractTLE(decodeURIComponent(data), function (name, id, tle) {
                scope.spawnSatellite(new Satellite(scope.satelliteTracker, tle));
            });
        }
    }

    extractTLE(data, callback) {
        let lines = data.split("\n");

        // Load TLE's
        for (let i = 0; i < lines.length; i += 3) {

            // TLE format
            let name = lines[i].trim();
            let line1 = lines[i + 1];
            let line2 = lines[i + 2];

            if (name !== "") {
                let id = line2.split(" ")[1];
                callback(name, parseInt(id), [name, line1, line2]);
            }
        }
    }

    // ################### User storage ###################

    setCookie(name, value, days) {
        let expires = "";
        if (days) {
            let date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    getCookie(name) {
        let nameEQ = name + "=";
        let ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    eraseCookie(name) {
        document.cookie = name + '=; Max-Age=-99999999;';
    }
}