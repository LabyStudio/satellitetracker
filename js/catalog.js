let satellites = [];
let focusedEarth = false;

function createSatellites() {
    // Create satellites
    satellites.push(new Satellite(25544, function (loaded, progress) {
        initializePercentage = progress;
        if (loaded) {
            initializationCompleted();
        }
    }).dock(45476, Port.POISK)
        .dock(45476, Port.RASSVET)
        .dock(37253, Port.FORWARD));
    //satellites.push(new Satellite(37253));
}

function getFocusedSatellite() {
    return satellites[0];
}
