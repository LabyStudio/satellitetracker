window.TextureRegistry = class {

    constructor(satelliteTracker, onProgress) {
        this.satelliteTracker = satelliteTracker;
        this.queue = [];
        this.textures = [];
        this.onProgress = onProgress;

        // Create queue and load textures
        this.queueTextures();
        this.loadNextTextureInQueue().finally();
    }

    queueTextures() {
        this.push("lens_flare", "assets/img/lensflares/lens_flare.png");
        this.push("moon_map", "assets/img/moon_map.jpg");
        this.push("sun_flare", "assets/img/lensflares/sun_flare.png");
        this.push("earth_map", "assets/img/earth_map.jpg");
        this.push("earth_bump", "assets/img/earth_bump.jpg");
        this.push("earth_normal", "assets/img/earth_normal.jpg");
        this.push("earth_spec", "assets/img/earth_spec.jpg");
        this.push("cloud_map", "assets/img/cloud_map.png");
        this.push("galaxy_starfield", "assets/img/galaxy_starfield.jpg");
        this.push("earth_night_map", "assets/img/earth_night_map.jpg");

        this.totalPercentage = this.length() * 100;
        this.updateProgress("Preparing textures", 0);
    }

    push(key, value) {
        this.queue[key] = value;
        this.textures[key] = new THREE.Texture();
    }

    pop() {
        let key = Object.keys(this.queue)[0];
        let pair = [key, this.queue[key]];
        delete this.queue[key];
        return pair;
    }

    length() {
        let amount = 0;
        for (let count in this.queue) {
            amount++;
        }
        return amount;
    }

    updateProgress(state, percentage) {
        this.onProgress(state, 100 / this.totalPercentage * percentage);
    }

    async loadNextTextureInQueue() {
        let length = this.length();
        if (length <= 0) {
            this.updateProgress("Textures loaded", this.totalPercentage);
        } else {
            let scope = this;
            let [key, path] = this.pop();

            let startProgress = this.totalPercentage - length * 100;
            this.updateProgress("Loading texture " + key + "...", startProgress);

            // Load texture
            this.satelliteTracker.textureLoader.load(path,
                function (onLoaded) {
                    let texture = scope.textures[key];
                    texture.image = onLoaded.image;
                    texture.needsUpdate = true;

                    scope.loadNextTextureInQueue();
                }, function (onProgress) {
                    // Progress callback doesn't work

                    //let progress = 100 / onProgress.total * onProgress.loaded;
                    //let percentage = startProgress + progress;
                },
                function (onError) {
                    scope.state = "Failed to load texture " + key;
                    scope.loadNextTextureInQueue();
                });
        }
    }

    get(key) {
        return this.textures[key];
    }

}