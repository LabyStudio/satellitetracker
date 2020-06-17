let registry = new SatelliteRegistry("php/catalog.php");

let focusedEarth = false;
let focusedSatellite = null;

function createSatellites(earthGroup, foreground) {
    registry.setSatelliteSpawnEnvironment(earthGroup, foreground);

    // Create ISS spacecraft
    registry.loadLocalTLE(ISS.ID, function (tle) {
        let satellite = ISS.createISSSpacecraft(tle);
        registry.spawnSatellite(satellite, false);

        // Default focus
        focusedSatellite = satellite;

        registry.loadUserCatalog();
    });

    // satellites.push(new Satellite(37253));
    // satellites.push(new Satellite(45572));


}

// ################### ISS ###################

// ISS Ports
class ISS {
    static ID = 25544;

    static PORT_RASSVET = new Port(0, -13.8, -6.9, 0, 0, 0);
    static PORT_POISK = new Port(0, 13.03, -19.9, 0, 0, 180);
    static PORT_PIRS = new Port(0, -11.55, -19.9, 0, 0, 0);
    static PORT_AFT = new Port(0, 0.8, -39.4, 90, 0, 0);
    static PORT_FORWARD = new Port(0, -0.8, 22.8, 180, 0, 0);

    static createISSSpacecraft(tle) {
        return new Satellite(tle, function (loaded, progress) {
            initializePercentage = progress;
            if (loaded) {
                initializationCompleted();
            }
        }).dock(45476, ISS.PORT_POISK)
            .dock(45476, ISS.PORT_RASSVET)
            .dock(37253, ISS.PORT_FORWARD);
    }
}

// ################### API ###################

/**
 * Current camera focused satellite
 * @returns Satellite
 */
function getFocusedSatellite() {
    return focusedSatellite;
}

function toggleEarthFocus() {
    focusedEarth = !focusedEarth;
}

function setFocusedSatellite(satellite) {
    focusedSatellite = satellite;
    focusedEarth = false;

    camera.position.x = satellite.model.marker.position.x;
    camera.position.z = satellite.model.marker.position.z;
}