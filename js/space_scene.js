// Create scene
const scene = new THREE.Scene();

// ISS
const loader = new THREE.GLTFLoader();
let iss = null;
loader.load('assets/ISS_stationary.glb', function (gltf) {
    scene.add(iss = gltf.scene);
}, function (xhr) {
}, function (error) {
    console.error(error);
});

// Earth
const sphereGeometry = new THREE.SphereBufferGeometry(6378137, 32, 32);
const sphereMaterial = new THREE.MeshStandardMaterial({color: 0xffffff});
sphereMaterial.map = THREE.ImageUtils.loadTexture('assets/earth.jpg')
sphereMaterial.map.minFilter = THREE.LinearFilter;

const earth = new THREE.Mesh(sphereGeometry, sphereMaterial);
earth.castShadow = true;
earth.receiveShadow = false;
scene.add(earth);

// Sun
const sun = new THREE.HemisphereLight(0xffffff, 0x000000, 4.0);
scene.add(sun);

// #############################################################
// ------------------------- RENDERING -------------------------
// #############################################################

let lastIssLon;
let lastIssLat;
let updateCounter = 0;

// Init
updateSpace();

function updateSpace() {
    // Calculate iss position
    if (iss != null) {
        let {longitude: issLon, latitude: issLat, height: issHeight} = getPositionOfISS(new Date());
        let heightOfIssInMeters = 6378137 + issHeight * 1000;

        // The ISS stays at position 0 0 0 but the earth is relative to the ISS,
        // so using the ISS position for the earth.

        earth.position.set(0, -heightOfIssInMeters, 0);
        earth.rotation.y = (-issLon + 90) * (Math.PI / 180);
        earth.rotation.x = (-issLat + 90) * (Math.PI / 180);

        const lat1 = issLat * (Math.PI / 180);
        const lon1 = issLon * (Math.PI / 180);
        const lat2 = lastIssLat * (Math.PI / 180);
        const lon2 = lastIssLon * (Math.PI / 180);

        // Calculate the direction of the ISS based on the previous location
        const dLon = Math.abs(lon2 - lon1);
        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        iss.rotation.y = -Math.atan2(y, x) - Math.PI / 2;

        // Save previous location
        if (updateCounter > 1000 || updateCounter === 0) {
            lastIssLon = issLon;
            lastIssLat = issLat;
            updateCounter = 0;
        }
        updateCounter++;
    }

    // Calculate sun position
    let {lng: sunLon, lat: sunLat} = getPositionOfSun(new Date());
    let {x: sunX, y: sunY, z: sunZ} = LLHtoECEF(sunLon, sunLat, 100000);
    sun.position.set(sunX, sunY, sunZ);
}

function getSpaceScene() {
    return scene;
}

function getCameraTarget() {
    return iss == null ? new THREE.Vector3(0, 0, 0) : iss.position;
}