window.SatellitePositionAtTime = class {
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