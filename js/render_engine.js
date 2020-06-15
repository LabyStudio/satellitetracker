const debug = false;
const supportWebGL = !!WebGLRenderingContext && (!!document.createElement('canvas').getContext('experimental-webgl')
    || !!document.createElement('canvas').getContext('webgl'));

let initialized = false;
let initializePercentage = 0;
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
let layers = createSpaceScene(camera, controls);
let sceneHUD = createHUDScene(hudCanvas, cameraHUD);

// Rendering
const render = function () {
    // The current time for tracking (Super fast time speed in debug mode)
    let date = debug ? new Date(1592243523070 + (new Date().getTime() - 1592243523070) * 700) : new Date();

    // Next frame
    requestAnimationFrame(render);

    // Update the controls
    controls.update();

    // Update the scenes
    updateSpace(date, layers);
    updateHUD(date);

    // Render scenes
    if (initialized) {
        // Render background
        camera.near = 70000;
        camera.updateProjectionMatrix();
        renderer.render(layers.background, camera);

        renderer.clearDepth();

        // Render foreground
        camera.near = 1;
        camera.updateProjectionMatrix();
        renderer.render(layers.foreground, camera);
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
    renderer.render(layers.background, camera);
    renderer.render(layers.foreground, camera);

    initialized = true;
    initializePercentage = 100;
    initializeTime = new Date().getTime();
}