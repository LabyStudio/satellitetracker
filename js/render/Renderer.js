window.Renderer = class {

    constructor(satelliteTracker, canvasWrapperId) {
        this.satelliteTracker = satelliteTracker;
        this.canvasWrapperId = canvasWrapperId;
        this.supportWebGL = !!WebGLRenderingContext && (!!document.createElement('canvas').getContext('experimental-webgl')
            || !!document.createElement('canvas').getContext('webgl'));

        this.isMobile = this.detectTouchDevice();

        this.mouseX = 0;
        this.mouseY = 0;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    init(spaceScene, hudScene) {
        // We will use 2D canvas element to render our HUD.
        this.hudCanvas = document.createElement('canvas')

        // Update canvas size
        this.updateCanvasSize();

        // Create cameras
        this.camera = new THREE.PerspectiveCamera(50, this.canvasWidth / this.canvasHeight, 1 /* Updated in space_scene */, 10000000000000);
        this.cameraHUD = new THREE.OrthographicCamera(0, 0, 0, 0, 0, 30);

        // Create web renderer
        this.canvasElement = document.createElement('canvas')
        this.webRenderer = this.supportWebGL ? new THREE.WebGLRenderer({
            canvas: this.canvasElement,
            antialias: true
        }) : new THREE.CanvasRenderer({
            canvas: this.canvasElement,
            antialias: true
        });

        // Add web renderer canvas to wrapper
        document.getElementById(this.canvasWrapperId).appendChild(this.canvasElement);

        // Setup renderer
        this.webRenderer.setSize(this.canvasWidth, this.canvasHeight);
        this.webRenderer.shadowMap.enabled = true;
        this.webRenderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
        this.webRenderer.autoClear = false;
        this.webRenderer.setClearColor(0x000000, 0);
        this.webRenderer.clear();

        // Create controls
        this.controls = new THREE.OrbitControls(this.camera, this.webRenderer.domElement);
        this.controls.enablePan = this.satelliteTracker.debug;
        this.controls.enableDamping = true
        this.controls.dampingFactor = 0.06;
        this.controls.rotateSpeed = 0.08;

        // Create scenes
        this.layers = spaceScene.createSpaceScene(this.camera);
        this.sceneHUD = hudScene.createHUDScene(this.hudCanvas, this.cameraHUD);

        this.registerListener();
        this.render();
    }

    render() {
        // Start stats
        this.satelliteTracker.stats.begin();

        // The current time for tracking
        let date = this.satelliteTracker.getTime();

        // Eclipse
        // date = new Date(1607962408000);

        // Next frame
        let scope = this;
        requestAnimationFrame(function () {
            scope.render();
        });

        // Update the controls
        this.controls.update();

        // Update the scenes
        this.satelliteTracker.spaceScene.updateSpace(date, this.layers);
        this.satelliteTracker.hudScene.updateHUD(date, this.mouseX, this.mouseY);

        // Render background
        this.camera.near = 70000;
        this.camera.updateProjectionMatrix();
        this.webRenderer.render(this.layers.background, this.camera);

        // New render order for the foreground layer
        this.webRenderer.clearDepth();

        // Render foreground
        this.camera.near = 1;
        this.camera.updateProjectionMatrix();
        this.webRenderer.render(this.layers.foreground, this.camera);

        // Render HUD
        this.webRenderer.render(this.sceneHUD, this.cameraHUD);

        // End stats
        this.satelliteTracker.stats.end();
    };

    registerListener() {
        let scope = this;

        // On resize
        window.addEventListener('resize', event => scope.onWindowResize(event), false);

        // Mouse click listener
        let dom = this.webRenderer.domElement;
        dom.addEventListener("mousedown", event => scope.onMouseClick(event), true);
        dom.addEventListener("mouseup", event => scope.onMouseRelease(event), true);
        dom.addEventListener("touchstart", event => scope.onTouchStart(event), true);
        dom.addEventListener("touchend", event => scope.onTouchEnd(event), true);
        dom.addEventListener("mousemove", event => scope.onMouseMove(event), true);

        // Keyboard
        window.addEventListener('keydown', event => scope.onKeyDown(event), false);
    }

    updateCanvasSize() {
        // Get canvas size
        let canvasElement = document.getElementById(this.canvasWrapperId);
        this.canvasWidth = canvasElement.offsetWidth;
        this.canvasHeight = canvasElement.offsetHeight;
    }

    onWindowResize() {
        this.updateCanvasSize();

        // Recreate Hud scene on resize
        this.sceneHUD = this.satelliteTracker.hudScene.createHUDScene(this.hudCanvas, this.cameraHUD);

        // Adjust camera
        this.camera.aspect = this.canvasWidth / this.canvasHeight;
        this.camera.updateProjectionMatrix();
        this.webRenderer.setSize(this.canvasWidth, this.canvasHeight);
    }

    onTouchStart(event) {
        if (event.changedTouches.length === 0)
            return;

        let touch = event.changedTouches[0];
        this.mouseX = touch.clientX;
        this.mouseY = touch.clientY;
        this.isMobile = true;
    }

    detectTouchDevice() {
        let match = window.matchMedia || window.msMatchMedia;
        if (match) {
            let mq = match("(pointer:coarse)");
            return mq.matches;
        }
        return false;
    }

    onTouchEnd(event) {
        if (event.changedTouches.length === 0)
            return;

        let touch = event.changedTouches[0];
        this.onMouseClick(touch);
    }

    onMouseRelease(event) {
        this.satelliteTracker.hudScene.onMouseRelease(event.clientX, event.clientY);
    }

    onMouseMove(event) {
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;

        this.satelliteTracker.hudScene.onMouseMove(event.clientX, event.clientY);
    }

    onMouseClick(event) {
        this.satelliteTracker.hudScene.onMouseClick(event.clientX, event.clientY);

        this.mouse.x = (event.clientX / this.webRenderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / this.webRenderer.domElement.clientHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Ray cast to the sprite to switch focused satellite
        Object.values(this.satelliteTracker.registry.satellites).forEach(satellite => {
            if (satellite.model.marker.visible) {
                let intersects = [];
                satellite.model.marker.raycast(this.raycaster, intersects);

                if (intersects.length > 0) {
                    this.satelliteTracker.setFocusedSatellite(satellite);
                }
            }
        });
    }

    onKeyDown(event) {
        this.satelliteTracker.hudScene.onKeyDownScreen(event.key, event.keyCode, event.ctrlKey);
    }
}