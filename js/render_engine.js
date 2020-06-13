const debug = false;
const supportWebGL = !!WebGLRenderingContext && (!!document.createElement('canvas').getContext('experimental-webgl')
    || !!document.createElement('canvas').getContext('webgl'));

let initialized = false;
let initializeTime = null;

// We will use 2D canvas element to render our HUD.
const hudCanvas = document.createElement('canvas');

// Create cameras
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1 /* Updated in space_scene */, 10000000000000);
const cameraHUD = new THREE.OrthographicCamera(0, 0, 0, 0, 0, 30);

// Setup renderer
const canvasElement = document.getElementById("space-canvas");
const renderer = supportWebGL ? new THREE.WebGLRenderer({
    canvas: canvasElement,
    antialias: true
}) : new THREE.CanvasRenderer({
    canvas: canvasElement,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
renderer.autoClear = false;
renderer.setClearColor(0x000000);
renderer.clear();

// Create controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true
controls.dampingFactor = 0.06;
controls.rotateSpeed = 0.08;

// Create scenes
const sceneSpace = createSpaceScene(camera, controls);
let sceneHUD = createHUDScene(hudCanvas, cameraHUD);

// Rendering
const render = function () {
    // The current time for tracking (Super fast time speed in debug mode)
    let date = debug ? new Date((new Date().getTime() - 1591446057000) * 100) : new Date();

    // Next frame
    requestAnimationFrame(render);

    // Update the controls
    updateCameraAndControls(camera, controls, date);
    controls.update();

    // Update the scenes
    updateSpace(date);
    updateHUD(date);

    // Render scenes
    if (initialized) {
        renderer.render(sceneSpace, camera);
    }
    renderer.render(sceneHUD, cameraHUD);
};

// Start rendering
render();

// On resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    // Recreate Hud scene on resize
    sceneHUD = createHUDScene(hudCanvas, cameraHUD);

    // Adjust camera
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function initializationCompleted() {
    // Trigger scene load before finishing the initialization
    renderer.render(sceneSpace, camera);

    initialized = true;
    initializeTime = new Date().getTime();
}