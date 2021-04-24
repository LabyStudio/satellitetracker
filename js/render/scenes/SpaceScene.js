window.SpaceScene = class {

    constructor(satelliteTracker, renderer) {
        this.satelliteTracker = satelliteTracker;
        this.renderer = renderer;

        this.sunGroup = new THREE.Object3D();
        this.earthGroup = new THREE.Object3D();
        this.centerGroup = new THREE.Object3D();

        this.sunForeground = null;
        this.earth = null;
        this.atmosphere = null;
        this.moon = null;
        this.clouds = null;
        this.nightSide = null;
    }

    createSpaceScene(camera) {
        // Create space scene
        const background = new THREE.Scene();
        const foreground = new THREE.Scene();

        // Bindings
        background.add(this.centerGroup);
        this.earthGroup.add(this.sunGroup)
        this.centerGroup.add(this.earthGroup);

        // Ambient Light
        const nightLight = new THREE.AmbientLight(0x888888, this.satelliteTracker.debug ? 3.2 : 0.1);
        background.add(nightLight);
        // Copy night light to foreground for lightning
        foreground.add(nightLight.clone());

        // Sun light
        const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
        sunLight.castShadow = true;
        this.sunGroup.add(sunLight);
        // Copy sun to foreground for lightning
        foreground.add(this.sunForeground = sunLight.clone());

        // Moon
        const moonGeometry = new THREE.SphereBufferGeometry(MOON_RADIUS, 32, 32);
        const moonMaterial = new THREE.MeshPhongMaterial({color: 0xffffff});
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        moonMaterial.map = this.satelliteTracker.textureRegistry.get('moon_map');
        this.earthGroup.add(this.moon);

        // Add sun flare
        let textureFlareLens = this.satelliteTracker.textureRegistry.get("lens_flare");
        let textureFlareSun = this.satelliteTracker.textureRegistry.get("sun_flare");
        let lensflare = new THREE.Lensflare();
        lensflare.addElement(new THREE.LensflareElement(textureFlareSun, 160, 0.0));
        lensflare.addElement(new THREE.LensflareElement(textureFlareLens, 60, 0.6));
        lensflare.addElement(new THREE.LensflareElement(textureFlareLens, 70, 0.7));
        lensflare.addElement(new THREE.LensflareElement(textureFlareLens, 120, 0.9));
        lensflare.addElement(new THREE.LensflareElement(textureFlareLens, 70, 1));
        sunLight.add(lensflare);

        // Earth
        const earthGeometry = new THREE.SphereBufferGeometry(EARTH_RADIUS, 64, 64);
        const earthMaterial = new THREE.MeshPhongMaterial({color: 0xffffff});
        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        earthMaterial.map = this.satelliteTracker.textureRegistry.get('earth_map');
        earthMaterial.bumpMap = this.satelliteTracker.textureRegistry.get('earth_bump');
        earthMaterial.normalMap = this.satelliteTracker.textureRegistry.get('earth_normal');
        earthMaterial.specularMap = this.satelliteTracker.textureRegistry.get('earth_spec');
        earthMaterial.specular = new THREE.Color(0x050505);
        earthMaterial.normalScale = new THREE.Vector2(0.4, 0.4);
        earthMaterial.shininess = 10;
        earthMaterial.polygonOffset = true;
        earthMaterial.polygonOffsetFactor = 2;
        this.earth.castShadow = true;
        this.earth.receiveShadow = true;
        this.earthGroup.add(this.earth);

        let scope = this;

        // Night side of earth (City light)
        this.createNightLightMaterial(function (nightLightMaterial) {
            scope.nightSide = new THREE.Mesh(new THREE.SphereBufferGeometry(EARTH_RADIUS + 1000, 64, 64), nightLightMaterial);
            scope.nightSide.renderOrder = -1; // Render below labels
            scope.earthGroup.add(scope.nightSide);
        });

        // Clouds
        const cloudsGeometry = new THREE.SphereBufferGeometry(EARTH_RADIUS + CLOUD_HEIGHT, 64, 64);
        const cloudsMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            depthTest: false,
            opacity: 0.8
        });
        this.clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
        cloudsMaterial.map = this.satelliteTracker.textureRegistry.get('cloud_map');
        this.clouds.castShadow = true;
        this.clouds.receiveShadow = true;
        this.earthGroup.add(this.clouds);

        // Atmosphere
        const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS + ATMOSPHERE_HEIGHT, 256, 256)
        this.createAtmosphereMaterial(function (atmosphereMaterial) {
            scope.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
            scope.atmosphere.castShadow = true;
            scope.atmosphere.receiveShadow = true;
            scope.centerGroup.add(scope.atmosphere);
        });

        // Stars
        const starsGeometry = new THREE.SphereBufferGeometry(SUN_DISTANCE * 2, 32, 32);
        const starsMaterial = new THREE.MeshBasicMaterial();
        const stars = new THREE.Mesh(starsGeometry, starsMaterial);
        starsMaterial.map = this.satelliteTracker.textureRegistry.get('galaxy_starfield');
        starsMaterial.side = THREE.BackSide;
        this.centerGroup.add(stars);

        // Add satellite model to earth group
        this.satelliteTracker.createSatellites(this.earthGroup, foreground);

        // Init
        this.updateSpace(new Date(this.satelliteTracker.getBrowserTime()), null);

        // Max camera distance in space
        this.renderer.controls.maxDistance = EARTH_RADIUS * 8;

        // ISS default view position
        camera.position.set(20, 70, 100);

        return {background, foreground};
    }

    updateSpace(date, layers) {
        let cameraDistance = this.renderer.controls.getRadius();
        let canSeeFocusedSatellite = cameraDistance < 10000;

        let focusedSatellite = this.satelliteTracker.getFocusedSatellite();
        if (focusedSatellite == null)
            return;

        // Update all satellite positions
        Object.values(this.satelliteTracker.registry.satellites).forEach(satellite => {
            satellite.updateModel(date, !canSeeFocusedSatellite, satellite.id === focusedSatellite.id);
        });

        // Focus a specific satellite with the camera
        this.focusSatellite(date, focusedSatellite, cameraDistance, canSeeFocusedSatellite, layers);

        // Calculate sun position
        let sunPosition = getPositionOfSun(date);
        let sunCoordinates = latLonRadToVector3(sunPosition.lat, sunPosition.lng + toRadians(90), SUN_DISTANCE);
        this.sunGroup.position.set(sunCoordinates.x, sunCoordinates.y, sunCoordinates.z);

        // Update sun position in foreground
        this.sunForeground.position.copy(this.sunGroup.position);

        // Calculate moon position
        let moonState = getMoonPosition(date);
        let moonPosition = latLonDegToVector3(moonState.latitude, moonState.longitude + 90, moonState.altitude);
        this.moon.position.set(moonPosition.x, moonPosition.y, moonPosition.z);

        // Update night side shader
        if (this.nightSide != null) {
            this.nightSide.material.uniforms.viewVector.value = sunCoordinates.normalize();
        }
    }

    focusSatellite(date, satellite, cameraDistance, canSeeFocusedSatellite, layers) {
        // Get data
        let posAndRot = satellite.getPositionAndRotationAtTime(date);

        // Update the position everything inside of the earth container
        this.centerGroup.position.set(0, -posAndRot.position.getDistanceToEarthCenter(), 0);

        // Rotate the earth with the ISS position to the top
        if (this.satelliteTracker.focusedEarth) {
            this.earthGroup.rotation.y = toRadians((date.getTime() % DAY_IN_MS / DAY_IN_MS) * 360);
        } else {
            // Rotate earth
            this.earthGroup.rotation.x = toRadians(-posAndRot.position.latitude + 90);
            this.earthGroup.rotation.y = toRadians(-posAndRot.position.longitude + 90);
        }

        // Sync position of satellites in foreground with the background
        if (layers !== null) {
            layers.foreground.position.copy(this.centerGroup.position);
            layers.foreground.rotation.copy(this.earthGroup.rotation);
        }

        // Cloud movement
        this.clouds.rotation.x = 0;
        this.clouds.rotation.y = toRadians((date.getTime() % (DAY_IN_MS * 2) / (DAY_IN_MS * 2)) * 360);

        // Update controls
        this.renderer.controls.zoomSpeed = cameraDistance < 200 || cameraDistance >= EARTH_RADIUS ? 1 : 8;
        this.renderer.controls.target = new THREE.Vector3(0, this.satelliteTracker.focusedEarth ? this.centerGroup.position.y : 0, 0);
        this.renderer.controls.minDistance = this.satelliteTracker.focusedEarth ? EARTH_RADIUS + ATMOSPHERE_HEIGHT * 8 : 10;

        // Update bump scale of earth
        this.earth.material.bumpScale = cameraDistance < EARTH_RADIUS ? 1000 : 10000;

        this.updateAtmosphere(cameraDistance, posAndRot);
    }

    updateAtmosphere(cameraDistance, posAndRot) {
        if (this.atmosphere == null)
            return;

        // The camera vector
        let cameraVector = new THREE.Vector3(this.renderer.camera.matrix.elements[8], this.renderer.camera.matrix.elements[9], this.renderer.camera.matrix.elements[10]);

        // Distance to the configured shader setting (The atmosphere shader is configured on a altitude of 437 km)
        let distanceToAtmosphere = this.satelliteTracker.focusedEarth ? cameraDistance : cameraDistance + posAndRot.position.altitude * 1000 - 437000;

        // Calculate fade out for atmosphere strength
        let strength = (ATMOSPHERE_STRENGTH - ATMOSPHERE_STRENGTH / this.renderer.controls.maxDistance * distanceToAtmosphere) * 2 - ATMOSPHERE_STRENGTH;

        // Shift the atmosphere border around the earth
        let unfocusedEarthShift = 18 - ((ATMOSPHERE_STRENGTH - strength) * 60);
        let focusedEarthShift = 30 * strength - 7.3;

        // Looking straight to earth or over the horizon
        this.atmosphere.material.uniforms.viewVector.value = this.satelliteTracker.focusedEarth ? cameraVector : new THREE.Vector3(0, 1, 0);
        this.atmosphere.material.uniforms.strength.value = Math.min(Math.max(strength, 0.0), ATMOSPHERE_STRENGTH);
        this.atmosphere.material.uniforms.shift.value = Math.max(0, this.satelliteTracker.focusedEarth ? focusedEarthShift : unfocusedEarthShift);
    }

    createAtmosphereMaterial(callback) {
        const loader = new THREE.FileLoader();
        loader.load("assets/shaders/atmosphere.frag", function (fragmentShader) {
            loader.load("assets/shaders/atmosphere.vert", function (vertexShader) {
                const material = new THREE.ShaderMaterial({
                    uniforms: THREE.UniformsUtils.merge([
                        THREE.UniformsLib.shadowmap,
                        THREE.UniformsLib.lights,
                        THREE.UniformsLib.ambient,
                        {
                            shift: {
                                type: "f",
                                value: 18.0
                            },
                            strength: {
                                type: "f",
                                value: ATMOSPHERE_STRENGTH
                            },
                            glowColor: {
                                type: "c",
                                value: new THREE.Color(0x2F6EA7)
                            },
                            viewVector: {
                                type: "v3",
                                value: new THREE.Vector3(0, 0, 0)
                            }
                        }]),
                    vertexShader: vertexShader,
                    fragmentShader: fragmentShader,
                    side: THREE.BackSide,
                    blending: THREE.AdditiveBlending,
                    transparent: true,
                    lights: true
                });

                callback(material);
            });
        });
    }

    createNightLightMaterial(callback) {
        let scope = this;

        let nightTexture = scope.satelliteTracker.textureRegistry.get('earth_night_map');
        nightTexture.magFilter = THREE.LinearFilter;
        nightTexture.minFilter = THREE.LinearMipMapLinearFilter;

        const loader = new THREE.FileLoader();
        loader.load("assets/shaders/nightside.frag", function (fragmentShader) {
            loader.load("assets/shaders/nightside.vert", function (vertexShader) {
                const uniforms = {
                    viewVector: {value: new THREE.Vector3(0, 0, 0)},
                    nightTexture: {value: nightTexture},
                };

                const material = new THREE.ShaderMaterial({
                    uniforms: uniforms,
                    vertexShader: vertexShader,
                    fragmentShader: fragmentShader,
                    transparent: true,
                    depthTest: false,
                    opacity: 0.6
                });

                callback(material);
            });
        });
    }
}