window.SatelliteTracker = class {

    constructor() {
        this.gltfLoader = new THREE.GLTFLoader();
        this.textureLoader = new THREE.TextureLoader();
        this.textureLoader.crossOrigin = "";

        this.focusedEarth = false;
        this.debug = false;
        this.focusedSatellite = null;

        this.initialized = false;
        this.initializePercentage = 0;
        this.initializeTime = null;

        // Create
        this.registry = new SatelliteRegistry(this, "php/catalog.php");
        this.renderer = new Renderer(this);
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
                scope.initializePercentage = progress;
                if (loaded) {
                    scope.initializationCompleted();
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
        // Trigger scene load before finishing the initialization
        this.renderer.renderer.render(this.renderer.layers.background, this.renderer.camera);
        this.renderer.renderer.render(this.renderer.layers.foreground, this.renderer.camera);

        this.initialized = true;
        this.initializePercentage = 100;
        this.initializeTime = new Date().getTime();
    }

// ################### API ###################

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
}