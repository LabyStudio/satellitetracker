/*
 * Render engine
 */
const supportWebGL = !!WebGLRenderingContext && (!!document.createElement('canvas').getContext('experimental-webgl')
    || !!document.createElement('canvas').getContext('webgl'));

// Create camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1 /* Updated in space_scene */, 100000000);

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

// Create scenes
const spaceScene = createSpaceScene(camera);

// Create controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enablePan = false;

// Add debug
const debugScene = createDebugScene(camera);
spaceScene.add(debugScene);

// Rendering
const render = function () {
    const time = new Date((new Date().getTime() - 1591446057000) * 500);

    // Next frame
    requestAnimationFrame(render);

    // Update the controls
    updateCameraAndControls(camera, controls);
    controls.update();

    // Locate debug scene in front of camera
    debugScene.rotation.x = camera.rotation.x;
    debugScene.rotation.y = camera.rotation.y;
    debugScene.rotation.z = camera.rotation.z;
    debugScene.position.x = camera.position.x;
    debugScene.position.y = camera.position.y;
    debugScene.position.z = camera.position.z;

    // Update the entire space
    updateSpace(time);
    updateDebug(time);

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