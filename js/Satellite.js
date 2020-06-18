class Satellite {

    constructor(tle, callback) {
        this.tle = tle;
        this.name = tle[0];

        // Create satellite record
        this.record = satellite.twoline2satrec(tle[1], tle[2]);
        this.id = this.record.satnum;

        // Create model for scene
        this.model = new SatelliteModel(this.id, this.name, callback, null);
        this.docking = [];
    }

    /**
     * Returns the satellite state at a specific time
     * @param date
     * @returns {SatelliteStateAtTime}
     */
    getStateAtTime(date = new Date()) {
        // Initialize a satellite record
        const positionAndVelocity = satellite.propagate(this.record, date);

        // The position_velocity result is a key-value pair of ECI coordinates.
        // These are the base results from which all other coordinates are derived.
        const positionEci = positionAndVelocity.position,
            velocity = positionAndVelocity.velocity;

        // You will need GMST for some of the coordinate transforms.
        // http://en.wikipedia.org/wiki/Sidereal_time#Definition
        const gmst = satellite.gstime(date);

        // You can get ECF, Geodetic, Look Angles, and Doppler Factor.
        const positionEcf = satellite.eciToEcf(positionEci, gmst),
            positionGd = satellite.eciToGeodetic(positionEci, gmst);

        // The coordinates are all stored in key-value pairs.
        // ECI and ECF are accessed by `x`, `y`, `z` properties.
        const satelliteX = positionEci.x,
            satelliteY = positionEci.y,
            satelliteZ = positionEci.z;

        // Geodetic coords are accessed via `longitude`, `latitude`, `height`.
        let latitude = positionGd.latitude,
            longitude = positionGd.longitude,
            height = positionGd.height;

        //  Convert the RADIANS to DEGREES
        latitude = satellite.degreesLat(latitude);
        longitude = satellite.degreesLong(longitude);

        return new SatelliteStateAtTime(latitude, longitude, height, velocity);
    }

    /**
     * Get advanced state at time
     * @param date
     * @returns {{rotation: THREE.Vector3, state: SatelliteStateAtTime, position: THREE.Vector3}}
     */
    getAdvancedStateAtTime(date = new Date()) {
        let timeDifference = 1000 * 60;

        // A few moments before
        let prevDate = new Date(date.getTime() + timeDifference);

        // Get current data and previous data
        let state = this.getStateAtTime(date);
        let prevState = this.getStateAtTime(prevDate);

        // Get current position and previous position
        let position = latLonDegToVector3(state.latitude, state.longitude + 90, state.getDistanceToEarthCenter());
        let prevPosition = latLonDegToVector3(prevState.latitude, prevState.longitude + 90, prevState.getDistanceToEarthCenter());

        // Get rotation
        let rotation = lookAtThreeJs(position, prevPosition);

        // Return the result
        return {state, rotation, position};
    }

    updateModel(date, showLabels, focused) {
        // Get data for main satellite
        let advancedState = this.getAdvancedStateAtTime(date);

        // Update main satellite
        this.model.update(date, advancedState, showLabels, this, focused, !showLabels);

        // Update docked satellites
        Object.values(this.docking).forEach(model => {
            model.update(date, advancedState, false, false, focused, !showLabels);
        });
    }

    addModels(parentGroup, foreground) {
        // Init main satellite
        this.model.addModels(parentGroup, foreground, true);

        // Init docked satellites
        Object.values(this.docking).forEach(satellite => {
            satellite.addModels(parentGroup, foreground, false);
        });
        return this;
    }

    destroyModels(parentGroup, foreground) {
        // Init main satellite
        this.model.destroyModels(parentGroup, foreground);

        // Init docked satellites
        Object.values(this.docking).forEach(satellite => {
            satellite.destroyModels(parentGroup, foreground);
        });
        return this;
    }

    dock(id, port) {
        this.docking.push(new SatelliteModel(id, "", SatelliteModel.EMPTY_CALLBACK, port));
        return this;
    }
}

class SatelliteStateAtTime {
    /**
     *
     * @param latitude Equator orientation
     * @param longitude Prime Meridian orientation
     * @param altitude The height in km
     * @param velocity The velocity of the satellite
     */
    constructor(latitude, longitude, altitude, velocity) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.altitude = altitude;
        this.velocity = velocity;
        this.crashed = isNaN(latitude) || isNaN(longitude);
    }

    /**
     * The total height of the position from the center in meters
     * @returns number
     */
    getDistanceToEarthCenter() {
        return EARTH_RADIUS + this.altitude * 1000;
    }

    /**
     * The speed in km/h of the satellite
     * @returns number
     */
    getSpeed() {
        return velocityToSpeed(this.velocity) * 3.6;
    }

    /**
     * Is the satellite no longer in the orbit?
     * @returns {boolean}
     */
    hasCrashed() {
        return this.crashed;
    }
}

class SatelliteModel {
    static get EMPTY_CALLBACK() {
        return function (loaded, progress) {
        };
    }

    constructor(id, name = "Unknown", callback = SatelliteModel.EMPTY_CALLBACK, port = null) {
        // Scene group
        this.label = new THREE.Object3D();
        this.model = new THREE.Object3D();

        // Get instance to access it in functions
        let scope = this;

        let successCallback = function (gltf) {
            scope.model.add(gltf.scene);

            // Shift model to the right docking port
            if (port != null) {
                gltf.scene.position.copy(port.offset);
                gltf.scene.rotation.set(port.rotation.x, port.rotation.y, port.rotation.z);
            }

            // Report that the model was loaded
            callback(true, 100);
        };

        // Load the model
        gltfLoader.load('assets/models/' + id + '.glb', successCallback, function (xhr) {
            // Report the model loading progress
            callback(false, 100 / xhr.total * xhr.loaded);
        }, function (error) {

            // Load the default model
            gltfLoader.load('assets/models/default.glb', successCallback, function (xhr) {
                // Report the model loading progress
                callback(false, 100 / xhr.total * xhr.loaded);
            }, function (error) {
                // Error occurred
                console.error(error);
            });
        });

        // Name of the satellite
        const labelName = new THREE_Text2D.SpriteText2D("      " + name, {
            align: THREE_Text2D.textAlign.left,
            font: 'bold 40px Arial',
            fillStyle: '#ffffff',
            antialias: true
        })
        labelName.material.sizeAttenuation = false;
        labelName.scale.set(0.0003, 0.0003, 1);
        this.label.add(labelName);

        // Marker circle
        const markerTextureMap = textureLoader.load("assets/img/marker.png");
        const markerMaterial = new THREE.SpriteMaterial({
            map: markerTextureMap,
            color: 0xffffff,
            sizeAttenuation: false
        });
        this.marker = new THREE.Sprite(markerMaterial);
        this.marker.scale.set(0.02, 0.02, 1);
        this.label.add(this.marker);

        // Prediction line
        const predictionLineGeometry = new THREE.BufferGeometry();
        const predictionLineMaterial = new THREE.LineBasicMaterial({color: 0xffffff});
        this.predictionLine = new THREE.Line(predictionLineGeometry, predictionLineMaterial);
    }

    update(date, advancedState, showLabels, satellite, focused, showModel) {
        // Set the absolute position and the rotation of the label
        this.label.position.set(advancedState.position.x, advancedState.position.y, advancedState.position.z);
        this.label.rotation.set(advancedState.rotation.x, advancedState.rotation.y, advancedState.rotation.z);

        // Apply the absolute position and the rotation to the model
        this.model.position.copy(this.label.position);
        this.model.rotation.copy(this.label.rotation);

        // Visible range of the focused satellite
        this.predictionLine.visible = showLabels;
        this.label.visible = showLabels;
        this.model.visible = showModel;

        // Calculate prediction line
        if (showLabels) {
            let points = [];
            for (let i = 0; i <= ISS_ORBIT_TIME; i += 1) {
                let timeToPredict = new Date(date.getTime() + 1000 * 60 * i);

                // Get data at this prediction time
                let state = satellite.getStateAtTime(timeToPredict);

                // Get position at this prediction time
                let position = latLonDegToVector3(state.latitude, state.longitude + 90, state.getDistanceToEarthCenter());
                points.push(position);
            }
            this.predictionLine.geometry.setFromPoints(points);
            this.predictionLine.material.color.setHex(focused ? 0x66A3FF : 0xFFFFFF);
        }
    }

    addModels(parentGroup, foreground, addLabels) {
        foreground.add(this.model);

        if (addLabels) {
            parentGroup.add(this.label);
            parentGroup.add(this.predictionLine);
        }
    }

    destroyModels(parentGroup, foreground) {
        foreground.remove(this.model);
        parentGroup.remove(this.label);
        parentGroup.remove(this.predictionLine);
    }

    shift(offset, rotation) {
        this.offset = offset;
        this.rotation = rotation;
        return this;
    }
}

class Port {
    constructor(offsetX, offsetY, offsetZ, rotationX, rotationY, rotationZ) {
        this.offset = new THREE.Vector3(offsetX, offsetY, offsetZ);
        this.rotation = new THREE.Vector3(toRadians(rotationX), toRadians(rotationY), toRadians(rotationZ));
    }
}