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
    return scripts.reduce((currentPromise, scriptUrl) => {
        return currentPromise.then(() => {
            return new Promise((resolve, reject) => {
                let script = document.createElement('script');
                script.async = true;
                script.src = scriptUrl;
                script.onload = () => resolve();
                document.getElementsByTagName('head')[0].appendChild(script);
            });
        });
    }, Promise.resolve());
}

// Load scripts
loadScripts([
    // Dependencies
    "js/utils/satellite.min.js",
    "js/utils/jquery.min.js",
    "js/utils/three/three.min.js",
    "js/utils/three/OrbitControls.js",
    "js/utils/three/GLTFLoader.js",
    "js/utils/three/lensflare.js",
    "js/utils/three/three-text2d.min.js",

    // Satellite Tracker Source
    "js/utils/position_utils.js",
    "js/satellite/Registry.js",
    "js/satellite/Satellite.js",
    "js/satellite/SatelliteModel.js",
    "js/satellite/Port.js",
    "js/satellite/State.js",
    "js/satellite/iss/ISS.js",
    "js/SatelliteTracker.js",
    "js/render/scenes/SpaceScene.js",
    "js/render/scenes/HUDScene.js",
    "js/render/Renderer.js"
]).then(() => {
    // Start satellite tracker
    new SatelliteTracker();
});