class Satellite {
    constructor(tle, callback, state = "default") {
        this.tle = tle;
        this.name = tle[0];

        // Create satellite record
        this.record = satellite.twoline2satrec(tle[1], tle[2]);
        this.id = this.record.satnum;

        // Create model for scene
        this.model = new SatelliteModel(this.id, state, this.name, callback, null);
        this.docking = [];
    }

    /**
     * Returns the satellite position at a specific time
     * @param date
     * @returns {SatellitePositionAtTime}
     */
    getPositionAtTime(date = new Date()) {
        // Initialize a satellite record
        const positionAndVelocity = satellite.propagate(this.record, date);

        // The position_velocity result is a key-value pair of ECI coordinates.
        // These are the base results from which all other coordinates are derived.
        const positionEci = positionAndVelocity.position,
            velocity = positionAndVelocity.velocity;

        // Invalid record
        if (positionEci === undefined) {
            return new SatellitePositionAtTime(Number.NaN, Number.NaN, Number.NaN, new THREE.Vector3());
        }

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
            altitude = positionGd.height;

        //  Convert the RADIANS to DEGREES
        latitude = satellite.degreesLat(latitude);
        longitude = satellite.degreesLong(longitude);

        return new SatellitePositionAtTime(latitude, longitude, altitude, velocity);
    }

    /**
     * Get position and rotation at time
     * @param date
     * @returns {{rotation: THREE.Vector3, position: SatellitePositionAtTime}}
     */
    getPositionAndRotationAtTime(date = new Date()) {
        let timeDifference = 1000 * 60;

        // A few moments before
        let prevDate = new Date(date.getTime() + timeDifference);

        // Get current data and previous data
        let position = this.getPositionAtTime(date);
        let prevPosition = this.getPositionAtTime(prevDate);

        // Get current position and previous position
        let coordinatePosition = latLonDegToVector3(position.latitude, position.longitude + 90, position.getDistanceToEarthCenter());
        let prevCoordinatePosition = latLonDegToVector3(prevPosition.latitude, prevPosition.longitude + 90, prevPosition.getDistanceToEarthCenter());

        // Get rotation
        let rotation = lookAtThreeJs(coordinatePosition, prevCoordinatePosition);

        // Store coordinate position into satellite position object
        position.x = coordinatePosition.x;
        position.y = coordinatePosition.y;
        position.z = coordinatePosition.z;

        // Return the result
        return {position, rotation};
    }

    updateModel(date, showLabels, focused) {
        // Get data for main satellite
        let posAndRot = this.getPositionAndRotationAtTime(date);

        // Update main satellite
        this.model.update(date, posAndRot, showLabels, this, focused, !showLabels);

        let scope = this;

        // Update docked satellites
        Object.values(this.docking).forEach(model => {
            model.update(date, posAndRot, false, scope, focused, !showLabels);
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

    dock(id, port, state = "default", animationCallback = SatelliteModel.EMPTY_ANIMATION_CALLBACK) {
        this.docking.push(new SatelliteModel(id, state, "", SatelliteModel.EMPTY_LOAD_CALLBACK, port, animationCallback));
        return this;
    }
}

class SatellitePositionAtTime {
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
    static get EMPTY_LOAD_CALLBACK() {
        return function (loaded, progress) {
        };
    }

    static get EMPTY_ANIMATION_CALLBACK() {
        return function (model, date, satellite) {
        };
    }

    constructor(id, state, name = "Unknown",
                callback = SatelliteModel.EMPTY_LOAD_CALLBACK,
                port = null,
                animationCallback = SatelliteModel.EMPTY_ANIMATION_CALLBACK) {

        // Animation callback to modify the offset and the rotation
        this.animationCallback = animationCallback;
        this.object = null;

        // Scene group
        this.label = new THREE.Object3D();
        this.model = new THREE.Object3D();

        // Get instance to access it in functions
        let scope = this;

        let successCallback = function (gltf) {
            scope.model.add(scope.object = gltf.scene);

            // Shift model to the right docking port
            if (port != null) {
                scope.shift(port.offset, port.rotation);
            }

            // Report that the model was loaded
            callback(true, 100);
        };

        // Load the model
        gltfLoader.load('assets/models/' + id + '/' + state + '.glb', successCallback, function (xhr) {
            // Report the model loading progress
            callback(false, 100 / xhr.total * xhr.loaded);
        }, function (error) {

            // Load the default model
            gltfLoader.load('assets/models/default/default.glb', successCallback, function (xhr) {
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

    update(date, posAndRot, showLabels, satellite, focused, showModel) {
        this.animationCallback(this, date, satellite);

        // Set the absolute position and the rotation of the label
        this.label.position.set(posAndRot.position.x, posAndRot.position.y, posAndRot.position.z);
        this.label.rotation.set(posAndRot.rotation.x, posAndRot.rotation.y, posAndRot.rotation.z);

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
                let state = satellite.getPositionAtTime(timeToPredict);

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
        if (this.object != null) {
            this.object.position.copy(offset);
            this.object.rotation.set(rotation.x, rotation.y, rotation.z);
        }
        return this;
    }
}

class Port {
    constructor(offsetX, offsetY, offsetZ, rotationX, rotationY, rotationZ) {
        this.offset = new THREE.Vector3(offsetX, offsetY, offsetZ);
        this.rotation = new THREE.Vector3(toRadians(rotationX), toRadians(rotationY), toRadians(rotationZ));
    }
}