let registry = new SatelliteRegistry("php/catalog.php");

let focusedEarth = false;
let focusedSatellite = null;

function createSatellites(earthGroup, foreground) {
    registry.setSatelliteSpawnEnvironment(earthGroup, foreground);

    // Create ISS spacecraft
    registry.loadLocalTLE(ISS.ID, function (tle) {
        let satellite = ISS.createSpacecraft(tle);
        registry.spawnSatellite(satellite, false);

        // Default focus
        focusedSatellite = satellite;

        registry.loadUserCatalog();
    });

    // satellites.push(new Satellite(37253));
    // satellites.push(new Satellite(45572));
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

    if (focusedEarth) {
        camera.position.y = Math.max(4853718, camera.position.y);
    } else {
        camera.position.x = 60;
        camera.position.y = 70;
        camera.position.z = 60;
    }
}

function setFocusedSatellite(satellite) {
    focusedSatellite = satellite;

    if (satellite !== undefined) {
        focusedEarth = false;
        camera.position.x = satellite.model.marker.position.x;
        camera.position.z = satellite.model.marker.position.z;
    } else {
        focusedEarth = true;
    }
}