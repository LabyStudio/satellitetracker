// Space
const EARTH_RADIUS = 6378137;
const ATMOSPHERE_HEIGHT = 80000;
const SUN_DISTANCE = 151840000000;
const SUN_RADIUS = 696340000;
const MOON_RADIUS = 1737100;
const ATMOSPHERE_STRENGTH = 1.0;
const ISS_ORBIT_TIME = 92;
const CLOUD_HEIGHT = 18288;
const DAY_IN_MS = 1000 * 60 * 60 * 24;

// Sun
const J2000_0 = 946728000000;
const DOUBLE_PI = 2.0 * Math.PI;
const MILLISECONDS_PER_CENTURY = 1000 * 3600 * 24 * 36525.0;

// Moon
const rad = Math.PI / 180;
const e = rad * 23.4397; // obliquity of the Earth

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
    let age, // Moon's age
        distance, // Moon's distance in earth radii
        latitude, // Moon's ecliptic latitude
        longitude, // Moon's ecliptic longitude
        altitude, // Altitude in m
        phase, // Moon's phase
        trajectory, // Moon's trajectory
        zodiac; // Moon's zodiac sign

    let yy, mm, k1, k2, k3, jd;
    let ip, dp, np, rp;

    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();


    yy = year - Math.floor((12 - month) / 10);
    mm = month + 9;
    if (mm >= 12) {
        mm = mm - 12;
    }

    k1 = Math.floor(365.25 * (yy + 4712));
    k2 = Math.floor(30.6 * mm + 0.5);
    k3 = Math.floor(Math.floor((yy / 100) + 49) * 0.75) - 38;

    jd = k1 + k2 + day + 59;  // for dates in Julian calendar
    if (jd > 2299160) {
        jd = jd - k3;      // for Gregorian calendar
    }

    //calculate moon's age in days
    ip = normalize((jd - 2451550.1) / 29.530588853);

    ip = ip * 2 * Math.PI;  //Convert phase to radians

    // Calculate moon's distance in earth radii
    dp = 2 * Math.PI * normalize((jd - 2451562.2) / 27.55454988);
    distance = 60.4 - 3.3 * Math.cos(dp) - 0.6 * Math.cos(2 * ip - dp) - 0.5 * Math.cos(2 * ip);
    altitude = distance * EARTH_RADIUS;

    // Calculate moon's ecliptic latitude
    np = 2 * Math.PI * normalize((jd - 2451565.2) / 27.212220817);
    latitude = 5.1 * Math.sin(np);

    // Calculate moon's ecliptic longitude
    rp = normalize((jd - 2451555.8) / 27.321582241);
    longitude = 360 * rp + 6.3 * Math.sin(dp) + 1.3 * Math.sin(2 * ip - dp) + 0.7 * Math.sin(2 * ip);

    // Debugging
    // altitude = EARTH_RADIUS;

    return {
        longitude: longitude, latitude: latitude, altitude: altitude
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

function sigmoid(input) {
    return (1 / (1 + Math.exp(-input * 2 + 4)));
}

function normalize(value) {
    value = value - Math.floor(value);
    if (value < 0) {
        value = value + 1;
    }
    return value;
}
