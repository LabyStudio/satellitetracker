function getPositionOfSun(date) {
    const rad = 0.017453292519943295;
    // based on NOAA solar calculations
    const mins_past_midnight = (date.getUTCHours() * 60 + date.getUTCMinutes()) / 1440;
    const jc = (((date.getTime() / 86400000.0) + 2440587.5) - 2451545) / 36525;
    const mean_long_sun = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360;
    const mean_anom_sun = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
    const sun_eq = Math.sin(rad * mean_anom_sun) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) + Math.sin(rad * 2 * mean_anom_sun) * (0.019993 - 0.000101 * jc) + Math.sin(rad * 3 * mean_anom_sun) * 0.000289;
    const sun_true_long = mean_long_sun + sun_eq;
    const sun_app_long = sun_true_long - 0.00569 - 0.00478 * Math.sin(rad * 125.04 - 1934.136 * jc);
    const mean_obliq_ecliptic = 23 + (26 + ((21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813)))) / 60) / 60;
    const obliq_corr = mean_obliq_ecliptic + 0.00256 * Math.cos(rad * 125.04 - 1934.136 * jc);
    const lat = Math.asin(Math.sin(rad * obliq_corr) * Math.sin(rad * sun_app_long)) / rad;
    const eccent = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);
    const y = Math.tan(rad * (obliq_corr / 2)) * Math.tan(rad * (obliq_corr / 2));
    const rq_of_time = 4 * ((y * Math.sin(2 * rad * mean_long_sun) - 2 * eccent * Math.sin(rad * mean_anom_sun) + 4 * eccent * y * Math.sin(rad * mean_anom_sun) * Math.cos(2 * rad * mean_long_sun) - 0.5 * y * y * Math.sin(4 * rad * mean_long_sun) - 1.25 * eccent * eccent * Math.sin(2 * rad * mean_anom_sun)) / rad);
    const true_solar_time = (mins_past_midnight * 1440 + rq_of_time) % 1440;
    const lng = -((true_solar_time / 4 < 0) ? true_solar_time / 4 + 180 : true_solar_time / 4 - 180);

    return {lng, lat};
}

function getPositionOfISS(date) {
    // Sample TLE
    const tleLine1 = '1 25544U 98067A   20152.78387051  .00000343  00000-0  14210-4 0  9991',
        tleLine2 = '2 25544  51.6445  69.6558 0002272  14.4249  80.9342 15.49401303229473';

    // Initialize a satellite record
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    const positionAndVelocity = satellite.propagate(satrec, date);

    // The position_velocity result is a key-value pair of ECI coordinates.
    // These are the base results from which all other coordinates are derived.
    const positionEci = positionAndVelocity.position,
        velocity = positionAndVelocity.velocity;

    // You will need GMST for some of the coordinate transforms.
    // http://en.wikipedia.org/wiki/Sidereal_time#Definition
    const gmst = satellite.gstime(new Date());

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

    return {latitude, longitude, height, velocity};
}

// https://gist.github.com/nicoptere/2f2571db4b454bb18cd9
function latLonToVector3(lat, lng) {
    let out = new THREE.Vector3();

    //flips the Y axis
    lat = Math.PI / 2 - lat;

    //distribute to sphere
    out.set(
        Math.sin(lat) * Math.sin(lng),
        Math.cos(lat),
        Math.sin(lat) * Math.cos(lng)
    );

    return out;
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function toDegrees(radians) {
    return radians * 180 / Math.PI;
}

function getYaw(vector) {
    return Math.atan2(vector.x, vector.z);
}

function getPitch(vector) {
    const distance = Math.sqrt(vector.z * vector.z + vector.x * vector.x);
    return Math.atan2(vector.y, distance);
}

function getVector(yaw, pitch) {
    const pi = Math.PI;
    const pitchRadians = toRadians(pitch);
    const yawRadians = toRadians(yaw);

    const sinPitch = Math.sin(pitchRadians);
    const cosPitch = Math.cos(pitchRadians);
    const sinYaw = Math.sin(yawRadians);
    const cosYaw = Math.cos(yawRadians);

    return new THREE.Vector3(-cosPitch * sinYaw, sinPitch, -cosPitch * cosYaw);
}


function lookAt(location, target) {
    let xDiff = target.x - location.x;
    let yDiff = target.y - location.y;
    let zDiff = target.z - location.z;

    let distanceXZ = Math.sqrt(xDiff * xDiff + zDiff * zDiff);
    let distanceY = Math.sqrt(distanceXZ * distanceXZ + yDiff * yDiff);


}