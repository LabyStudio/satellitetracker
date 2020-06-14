class Satellite {
    constructor(id) {
        // https://celestrak.com/satcat/tle.php?CATNR=25544
        // https://celestrak.com/pub/TLE/catalog.txt

        // Load TLE
        let tle = $.ajax({
            type: "GET",
            url: "assets/tle/" + id + ".txt",
            async: false
        }).responseText.split("\n");

        // Create satellite record
        this.record = satellite.twoline2satrec(tle[1], tle[2]);
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
        let prevPosition = latLonDegToVector3(prevState.latitude, prevState.longitude  + 90, prevState.getDistanceToEarthCenter());

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