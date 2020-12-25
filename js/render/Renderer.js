window.Renderer = class {

    constructor(satelliteTracker) {
        this.satelliteTracker = satelliteTracker;
        this.supportWebGL = !!WebGLRenderingContext && (!!document.createElement('canvas').getContext('experimental-webgl')
            || !!document.createElement('canvas').getContext('webgl'));

        this.isMobile = this.detectTouchDevice();

        this.mouseX = 0;
        this.mouseY = 0;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.appStart = new Date().getTime();
    }

    init(spaceScene, hudScene) {
        // We will use 2D canvas element to render our HUD.
        this.hudCanvas = document.createElement('canvas')

        // Create cameras
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1 /* Updated in space_scene */, 10000000000000);
        this.cameraHUD = new THREE.OrthographicCamera(0, 0, 0, 0, 0, 30);

        // Setup renderer
        this.canvasElement = document.getElementById("space-canvas");
        this.renderer = this.supportWebGL ? new THREE.WebGLRenderer({
            canvas: this.canvasElement,
            antialias: true
        }) : new THREE.CanvasRenderer({
            canvas: this.canvasElement,
            antialias: true
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
        this.renderer.autoClear = false;
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.clear();

        // Create controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
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
        // The current time for tracking (Super fast time speed in debug mode)
        let date = this.satelliteTracker.debug ? new Date(this.appStart + (new Date().getTime() - this.appStart) * 600) : new Date();

        // Eclipse
        // date = new Date(1607962408000);

        // Next frame
        let scope = this;
        requestAnimationFrame(function() {
            scope.render();
        });

        // Update the controls
        this.controls.update();

        // Update the scenes
        this.satelliteTracker.spaceScene.updateSpace(date, this.layers);
        this.satelliteTracker.hudScene.updateHUD(date, this.mouseX, this.mouseY);

        // Render scenes
        if (this.satelliteTracker.initialized) {
            // Render background
            this.camera.near = 70000;
            this.camera.updateProjectionMatrix();
            this.renderer.render(this.layers.background, this.camera);

            this.renderer.clearDepth();

            // Render foreground
            this.camera.near = 1;
            this.camera.updateProjectionMatrix();
            this.renderer.render(this.layers.foreground, this.camera);
        }

        this.renderer.render(this.sceneHUD, this.cameraHUD);
    };

    registerListener() {
        let scope = this;

        // On resize
        window.addEventListener('resize', event => scope.onWindowResize(event), false);

        // Mouse click listener
        let dom = this.renderer.domElement;
        dom.addEventListener("click", event => scope.onClick(event), true);
        dom.addEventListener("touchstart", event => scope.onTouchStart(event), true);
        dom.addEventListener("touchend", event => scope.onTouchEnd(event), true);
        dom.addEventListener("mousemove", event => scope.onMove(event), true);

        // Keyboard
        window.addEventListener('keydown', event => scope.onKeyDown(event), false);
    }

    onWindowResize() {
        // Recreate Hud scene on resize
        this.sceneHUD = this.satelliteTracker.hudScene.createHUDScene(this.hudCanvas, this.cameraHUD);

        // Adjust camera
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
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
        if(match) {
            let mq = match("(pointer:coarse)");
            return mq.matches;
        }
        return false;
    }

    onTouchEnd(event) {
        if (event.changedTouches.length === 0)
            return;

        let touch = event.changedTouches[0];
        this.onClick(touch);
    }

    onMove(event) {
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
    }

    onClick(event) {
        this.satelliteTracker.hudScene.onClickScreen(event.clientX, event.clientY);

        this.mouse.x = (event.clientX /this. renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;

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