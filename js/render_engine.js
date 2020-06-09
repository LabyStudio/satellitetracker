/*
 * Render engine
 */
const supportWebGL = !!WebGLRenderingContext && (!!document.createElement('canvas').getContext('experimental-webgl')
    || !!document.createElement('canvas').getContext('webgl'));

// Create camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, -1);
camera.position.z = 100;

// Setup renderer
const canvasElement = document.getElementById("space-canvas");
const renderer = supportWebGL ? new THREE.WebGLRenderer({
    canvas: canvasElement
}) : new THREE.CanvasRenderer({
    canvas: canvasElement
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
renderer.setClearColor( 0x050505 );

// Create scene
const spaceScene = getSpaceScene();

// Create controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);

// Rendering
const render = function () {
    // Next frame
    requestAnimationFrame(render);

    // Update the controls
    controls.update();

    // Update the entire space
    updateSpace();

    // Render scene
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