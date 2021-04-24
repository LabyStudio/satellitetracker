window.Satellite = class {
    constructor(satelliteTracker, tle, callback, state = "default") {
        this.satelliteTracker = satelliteTracker;

        this.tle = tle;
        this.name = tle[0];

        // Create satellite record
        this.record = satellite.twoline2satrec(tle[1], tle[2]);
        this.id = this.record.satnum;

        // Create model for scene
        this.model = new SatelliteModel(satelliteTracker, this.id, state, this.name, callback, null);
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
        let positionData = this.getPositionData(date);
        let position = positionData.position;

        // Get rotation
        let rotation = lookAtThreeJs(positionData.coordinatePosition, positionData.prevCoordinatePosition);

        // Store coordinate position into satellite position object
        position.x = positionData.coordinatePosition.x;
        position.y = positionData.coordinatePosition.y;
        position.z = positionData.coordinatePosition.z;

        // Return the result
        return {position, rotation, positionData};
    }

    getPositionData(date = new Date()) {
        let timeDifference = 1000 * 60;

        // A few moments before
        let prevDate = new Date(date.getTime() + timeDifference);

        // Get current data and previous data
        let position = this.getPositionAtTime(date);
        let prevPosition = this.getPositionAtTime(prevDate);

        // Get current position and previous position
        let coordinatePosition = latLonDegToVector3(position.latitude, position.longitude + 90, position.getDistanceToEarthCenter());
        let prevCoordinatePosition = latLonDegToVector3(prevPosition.latitude, prevPosition.longitude + 90, prevPosition.getDistanceToEarthCenter());

        return {position, coordinatePosition, prevPosition, prevCoordinatePosition};
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

    dock(id, name, port, state = State.DOCKED, animationCallback = SatelliteModel.EMPTY_ANIMATION_CALLBACK) {
        this.docking.push(new SatelliteModel(this.satelliteTracker, id, state, name, SatelliteModel.EMPTY_LOAD_CALLBACK, port, animationCallback));
        return this;
    }
}