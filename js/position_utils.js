// Space
const EARTH_RADIUS = 6378137;
const ATMOSPHERE_HEIGHT = 80000;
const SUN_DISTANCE = 151840000000;
const SUN_RADIUS = 696340000;
const MOON_RADIUS = 1737100;
const ATMOSPHERE_STRENGTH = 0.6;
const ISS_ORBIT_TIME = 92;
const CLOUD_HEIGHT = 18288;

// Sun
const J2000_0 = 946728000000;
const DOUBLE_PI = 2.0 * Math.PI;
const MILLISECONDS_PER_CENTURY = 1000 * 3600 * 24 * 36525.0;

// Moon
const rad = Math.PI / 180;
const e = rad * 23.4397; // obliquity of the Earth
const dayMs = 1000 * 60 * 60 * 24,
    J1970 = 2440588,
    J2000 = 2451545;

// ################ SUN ################

/**
 *
 * @param date
 * @returns {{lng: number, lat: number}}
 */
function getPositionOfSun(date) {
    const sunPos = getEquatorialSunPosition(date);
    return getSunGroundPoint(date.getTime(), sunPos);
}

function getEquatorialSunPosition(date) {
    const n = (date.getTime() - J2000_0) / 86400000.0;
    const lDeg = 280.460 + 0.9856474 * n;
    const gDeg = 357.528 + 0.9856003 * n;
    const g = toRadians(gDeg);
    const lambdaDeg = lDeg + 1.915 * Math.sin(g) + 0.020 * Math.sin(2.0 * g);
    const lambda = toRadians(lambdaDeg);

    const eDeg = 23.4393 - 3.563e-7 * n;
    const e = toRadians(eDeg);

    const sinLambda = Math.sin(lambda);
    const rectAsc = Math.atan2(Math.cos(e) * sinLambda, Math.cos(lambda));
    const decl = Math.asin(Math.sin(e) * sinLambda);

    return {rectAsc: rectAsc, decl: decl};
}

function getSunGroundPoint(time, sunPos) {
    const lat = sunPos.decl;
    const lng = sunPos.rectAsc - getGMST(time);
    return {lng: lng, lat: lat};
}

function getGMST(time) {
    const today0utc = new Date(time);
    today0utc.setUTCHours(0, 0, 0, 0);
    const utInMillis = time - today0utc.getTime();
    const ut = utInMillis / 3600000.0 / 12.0 * Math.PI;   // in radians
    return rev(getGMST0(time) + ut);
}

function getGMST0(time) {
    const tSinceJ2000_0 = time - J2000_0;
    const t = tSinceJ2000_0 / MILLISECONDS_PER_CENTURY;  // Julian centuries since J2000.0
    let gmst0Degrees = 100.46061837;
    gmst0Degrees += 36000.770053608 * t;
    gmst0Degrees += 3.87933e-4 * t * t;
    gmst0Degrees += t * t * t / 38710000.0;
    const gmst0Radians = toRadians(gmst0Degrees);
    return rev(gmst0Radians);
}

function rev(angle) {
    return (angle - Math.floor(angle / DOUBLE_PI) * DOUBLE_PI);
}

// ################ MOON ################

function getMoonPosition(date) { // geocentric ecliptic coordinates of the moon
    const time = toDays(date);
    let L = rad * (218.316 + 13.176396 * time), // ecliptic longitude
        M = rad * (134.963 + 13.064993 * time), // mean anomaly
        F = rad * (93.272 + 13.229350 * time),  // mean distance

        longitude = L + rad * 6.289 * Math.sin(M), // longitude
        latitude = rad * 5.128 * Math.sin(F),     // latitude
        distance = 385001 - 20905 * Math.cos(M);  // distance to the moon in km

    longitude = rightAscension(longitude, latitude);
    latitude = declination(longitude, latitude);

    return {
        longitude: longitude, latitude: latitude, distance: distance
    };
}


// ################ Utils ################

// https://gist.github.com/nicoptere/2f2571db4b454bb18cd9
function latLonRadToVector3(lat, lng, height) {
    let out = new THREE.Vector3();

    //flips the Y axis
    lat = Math.PI / 2 - lat;

    //distribute to sphere
    out.set(
        Math.sin(lat) * Math.sin(lng) * height,
        Math.cos(lat) * height,
        Math.sin(lat) * Math.cos(lng) * height
    );

    return out;
}

function latLonDegToVector3(lat, lng, height) {
    // To radians
    lat = toRadians(lat);
    lng = toRadians(lng);

    return latLonRadToVector3(lat, lng, height);
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

function velocityToSpeed(velocity) {
    return Math.sqrt(Math.pow(velocity.x, 2) + Math.pow(velocity.y, 2) + Math.pow(velocity.z, 2)) * 1000
}

function getVector(yaw, pitch) {
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

    let yaw = toDegrees(Math.acos(xDiff / distanceXZ));
    let pitch = toDegrees(Math.acos(yDiff / distanceY)) - 90.0;

    if (zDiff < 0.0) {
        yaw += Math.abs(180.0 - yaw) * 2.0;
    }

    return getVector(yaw - 90, pitch);
}

function lookAtThreeJs(location, target) {
    // Create dummy object to use the lookAt function
    let dummy = new THREE.Object3D();
    dummy.position.set(location.x, location.y, location.z);
    dummy.up = location;
    dummy.lookAt(target);

    // Extract the rotation of the dummy object
    return dummy.rotation;
}

function rightAscension(l, b) {
    return Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
}

function declination(l, b) {
    return Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
}

function toJulian(date) {
    return date.valueOf() / dayMs - 0.5 + J1970;
}

function fromJulian(j) {
    return new Date((j + 0.5 - J1970) * dayMs);
}

function toDays(date) {
    return toJulian(date) - J2000;
}

function sigmoid(input) {
    return (1 / (1 + Math.exp(-input * 2 + 4)));
}