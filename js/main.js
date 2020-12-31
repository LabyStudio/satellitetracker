// Browser test function
function isES6() {
    try {
        Function("() => {};");
        return true;
    } catch (exception) {
        return false;
    }
}

// Test for browser support
if (!isES6()) {
    alert("Your browser isn't supported! Please use another one.");
}

// Script loader
function loadScripts(scripts) {
    let total = scripts.length;
    let index = 0;

    return scripts.reduce((currentPromise, scriptUrl) => {
        return currentPromise.then(() => {
            return new Promise((resolve, reject) => {
                // Update status message
                updatePreStatus("Loading scripts... " + index + "/" + total);

                // Load script
                let script = document.createElement('script');
                script.async = true;
                script.src = scriptUrl;
                script.onload = () => resolve();
                document.getElementsByTagName('head')[0].appendChild(script);

                index++;
            });
        });
    }, Promise.resolve());
}

function updatePreStatus(message) {
    document.getElementById("pre-status").innerText = message;
}

// Load scripts
loadScripts([
    // Dependencies
    "js/utils/stats.min.js",
    "js/utils/satellite.min.js",
    "js/utils/jquery.min.js",
    "js/utils/three/three.min.js",
    "js/utils/three/OrbitControls.js",
    "js/utils/three/GLTFLoader.js",
    "js/utils/three/lensflare.js",
    "js/utils/three/three-text2d.min.js",
    "js/utils/three/DRACOLoader.js",

    // Satellite Tracker Source
    "js/utils/LoadingProgress.js",
    "js/utils/position_utils.js",
    "js/satellite/Registry.js",
    "js/satellite/Satellite.js",
    "js/satellite/SatellitePositionAtTime.js",
    "js/satellite/SatelliteModel.js",
    "js/satellite/Port.js",
    "js/satellite/State.js",
    "js/satellite/iss/ISS.js",
    "js/SatelliteTracker.js",
    "js/render/scenes/SpaceScene.js",
    "js/render/scenes/HUDScene.js",
    "js/render/TextureRegistry.js",
    "js/render/Renderer.js"
]).then(() => {
    // Remove pre status
    document.getElementById("pre-status").remove();

    // Start satellite tracker
    window.app = new SatelliteTracker("canvas");
});