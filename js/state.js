let registry = new SatelliteRegistry("php/catalog.php");

let focusedEarth = false;
let focusedSatellite = null;

function createSatellites(earthGroup, foreground) {
    registry.setSatelliteSpawnEnvironment(earthGroup, foreground);

    // Create ISS spacecraft
    registry.loadLocalTLE(25544, function(tle) {
        let satellite = createISSSpacecraft(tle);
        registry.spawnSatellite(satellite);

        // Default focus
        focusedSatellite = satellite;
    });

    // satellites.push(new Satellite(37253));
    // satellites.push(new Satellite(45572));

    /*registry.loadAll(function() {
        let a = 0;
        Object.values(registry.database).forEach(tle => {

            if(a % 100 == 0)
            registry.spawnSatellite(new Satellite(tle));
            a++;
        });
    });
    */
}

// ################### ISS ###################

// ISS Ports
class ISSPort {
    static RASSVET = new Port(0, -13.8, -6.9, 0, 0, 0);
    static POISK = new Port(0, 13.03, -19.9, 0, 0, 180);
    static PIRS = new Port(0, -11.55, -19.9, 0, 0, 0);
    static AFT = new Port(0, 0.8, -39.4, 90, 0, 0);
    static FORWARD = new Port(0, -0.8, 22.8, 180, 0, 0);
}

function createISSSpacecraft(tle) {
    return new Satellite(tle, function (loaded, progress) {
        initializePercentage = progress;
        if (loaded) {
            initializationCompleted();
        }
    }).dock(45476, ISSPort.POISK)
        .dock(45476, ISSPort.RASSVET)
        .dock(37253, ISSPort.FORWARD);
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