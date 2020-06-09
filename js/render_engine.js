const debug = false;
const supportWebGL = !!WebGLRenderingContext && (!!document.createElement('canvas').getContext('experimental-webgl')
    || !!document.createElement('canvas').getContext('webgl'));

// Create camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1 /* Updated in space_scene */, 10000000000000);

// ISS default view position
camera.position.set(20, 70, 100);

// Setup renderer
const canvasElement = document.getElementById("space-canvas");
const renderer = supportWebGL ? new THREE.WebGLRenderer({
    canvas: canvasElement,
    antialias: true,
    preserveDrawingBuffer: true
}) : new THREE.CanvasRenderer({
    canvas: canvasElement,
    antialias: true,
    preserveDrawingBuffer: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
renderer.setClearColor(0x000000);
renderer.clear();

// Create controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true
controls.dampingFactor = 0.06;
controls.rotateSpeed = 0.08;

// Create scenes
const spaceScene = createSpaceScene(camera, controls);

// Add debug
if (debug) {
    debugScene = createDebugScene(camera);
    spaceScene.add(debugScene);
}

// Rendering
const render = function () {
    // The current time for tracking (Super fast time speed in debug mode)
    let time = debug ? new Date((new Date().getTime() - 1591446057000) * 500) : new Date();

    // Next frame
    requestAnimationFrame(render);

    // Update the controls
    updateCameraAndControls(camera, controls);
    controls.update();

    if (debug) {
        // Locate debug scene in front of camera
        updateDebug(debugScene, camera, time);
    }

    // Update the entire space
    updateSpace(time);

    // Render scenes
    renderer.render(spaceScene, camera);
};

// Start rendering
render();

// On resize
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}