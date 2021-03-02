window.SatelliteTracker = class {

    constructor(canvasWrapperId) {
        this.gltfLoader = new THREE.GLTFLoader();

        // THREE texture loader
        this.textureLoader = new THREE.TextureLoader();
        this.textureLoader.crossOrigin = "";

        // Init loading progress
        let scope = this;
        this.loadingProgress = new LoadingProgress(this,
            {
                "texture": "Loading Textures...",
                "model": "Loading ISS model..."
            }, function () {
                scope.initializationCompleted();
            });

        // Create texture registry
        this.textureRegistry = new TextureRegistry(this, function (state, progress) {
            scope.loadingProgress.updateProgress("texture", progress);
            scope.loadingProgress.updateState("texture", state);
        });

        // Provide a DRACOLoader instance to decode compressed mesh data
        let dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('js/utils/three/decoder/');
        dracoLoader.preload();
        this.gltfLoader.setDRACOLoader(dracoLoader);

        // States
        this.focusedEarth = false;
        this.debug = false;
        this.focusedSatellite = null;
        this.initializeTime = null;
        this.currentTime = this.getBrowserTime();
        this.prevTime = this.getBrowserTime();
        this.timeSpeed = 1;

        // Stats
        this.stats = new Stats();

        // Show fps
        if (window.location.hash === "#fps") {
            this.stats.showPanel(0);
            document.body.appendChild(this.stats.dom);
        }

        // Create
        this.registry = new SatelliteRegistry(this, "php/catalog.php");
        this.renderer = new Renderer(this, canvasWrapperId);
        this.spaceScene = new SpaceScene(this, this.renderer);
        this.hudScene = new HUDScene(this);

        // Init
        this.renderer.init(this.spaceScene, this.hudScene);
    }

    createSatellites(earthGroup, foreground) {
        this.registry.setSatelliteSpawnEnvironment(earthGroup, foreground);

        let scope = this;

        // Create ISS spacecraft
        this.registry.loadLocalTLE(ISS.ID, function (tle) {
            let satellite = ISS.createSpacecraft(scope, tle, function (loaded, progress) {
                scope.loadingProgress.updateProgress("model", loaded ? 100 : Math.min(99, progress));

                if (progress >= 100) {
                    scope.loadingProgress.updateState("model", "Initializing model...")
                }
            });
            scope.registry.spawnSatellite(satellite, false);

            // Default focus
            scope.focusedSatellite = satellite;

            scope.registry.loadUserCatalog();
        });

        //this.registry.loadLocalTLE(45623, function(tle) {
        //    scope.registry.spawnSatellite(new Satellite(tle), false);
        //})
    }

    initializationCompleted() {
        this.initializeTime = this.getBrowserTime();
    }

    /**
     * Current camera focused satellite
     * @returns Satellite
     */
    getFocusedSatellite() {
        return this.focusedSatellite;
    }

    toggleEarthFocus() {
        this.focusedEarth = !this.focusedEarth;

        if (this.focusedEarth) {
            this.renderer.camera.position.y = Math.max(4853718, this.renderer.camera.position.y);
        } else {
            this.renderer.camera.position.x = 60;
            this.renderer.camera.position.y = 70;
            this.renderer.camera.position.z = 60;
        }
    }

    setFocusedSatellite(satellite) {
        this.focusedSatellite = satellite;

        if (satellite !== undefined) {
            this.focusedEarth = false;
            this.renderer.camera.position.x = satellite.model.marker.position.x;
            this.renderer.camera.position.z = satellite.model.marker.position.z;
        } else {
            this.focusedEarth = true;
        }
    }

    getTime() {
        let passed = (this.getBrowserTime() - this.prevTime) * (this.timeSpeed > -1.0 && this.timeSpeed < 0 ? 0 : this.timeSpeed);
        return new Date(this.currentTime + (passed | 0));
    }

    getBrowserTime() {
        return new Date().getTime();
    }
}