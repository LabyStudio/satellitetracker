class Satellite {
    id;
    name;
    model;

    constructor(id, report = function (loaded, progress) {
    }) {
        // https://celestrak.com/satcat/tle.php?CATNR=25544
        // https://celestrak.com/pub/TLE/catalog.txt

        // Load TLE
        let tle = $.ajax({
            type: "GET",
            url: "assets/tle/" + id + ".txt",
            async: false
        }).responseText.split("\n");

        this.id = id;
        this.name = tle[0];

        // Create satellite record
        this.record = satellite.twoline2satrec(tle[1], tle[2]);

        // Create model for scene
        this.model = new SatelliteModel(this, report);
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
}

class SatelliteStateAtTime {
    /**
     * Equator orientation
     */
    latitude;

    /**
     * Prime Meridian orientation
     */
    longitude;

    /**
     * The height in km
     */
    altitude;

    /**
     * The velocity of the satellite
     */
    velocity = new THREE.Vector3();

    constructor(latitude, longitude, altitude, velocity) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.altitude = altitude;
        this.velocity = velocity;
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
}

class SatelliteModel {
    constructor(satellite, report) {
        this.satellite = satellite;

        // Get instance to access it in functions
        let instance = this;

        // Scene group
        this.label = new THREE.Object3D();
        this.model = new THREE.Object3D();

        // Load the model
        gltfLoader.load('assets/models/' + satellite.id + '.glb', function (gltf) {
            instance.model.add(gltf.scene);

            // Report that the model was loaded
            report(true, 100);
        }, function (xhr) {

            // Report the model loading progress
            report(false, 100 / xhr.total * xhr.loaded);
        }, function (error) {

            // Error occurred
            console.error(error);
        });

        // Name of the satellite
        const labelName = new THREE_Text2D.SpriteText2D("      " + satellite.name, {
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
        const marker = new THREE.Sprite(markerMaterial);
        marker.scale.set(0.02, 0.02, 1);
        this.label.add(marker);

        // Prediction line
        const predictionLineGeometry = new THREE.BufferGeometry();
        const predictionLineMaterial = new THREE.LineBasicMaterial({color: 0xffffff});
        this.predictionLine = new THREE.Line(predictionLineGeometry, predictionLineMaterial);
    }

    update(date, showLabels) {
        // Get data
        let advancedState = this.satellite.getAdvancedStateAtTime(date);

        // Set the absolute position and the rotation of the label
        this.label.position.set(advancedState.position.x, advancedState.position.y, advancedState.position.z);
        this.label.rotation.set(advancedState.rotation.x, advancedState.rotation.y, advancedState.rotation.z);

        // Apply the absolute position and the rotation to the model
        this.model.position.copy(this.label.position);
        this.model.rotation.copy(this.label.rotation);

        // Visible range of the focused satellite
        this.predictionLine.visible = showLabels;
        this.label.visible = showLabels;

        // Calculate prediction line
        if (showLabels) {
            let points = [];
            for (let i = 0; i <= ISS_ORBIT_TIME; i += 1) {
                let timeToPredict = new Date(date.getTime() + 1000 * 60 * i);

                // Get data at this prediction time
                let state = this.satellite.getStateAtTime(timeToPredict);

                // Get position at this prediction time
                let position = latLonDegToVector3(state.latitude, state.longitude + 90, state.getDistanceToEarthCenter());
                points.push(position);
            }
            this.predictionLine.geometry.setFromPoints(points);
        }
    }

    addModelsTo(parentGroup, foreground) {
        foreground.add(this.model);
        parentGroup.add(this.label);
        parentGroup.add(this.predictionLine);
    }
}