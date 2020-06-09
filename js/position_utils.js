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
        velocityEci = positionAndVelocity.velocity;

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
    let longitude = positionGd.longitude,
        latitude = positionGd.latitude,
        height = positionGd.height;

    //  Convert the RADIANS to DEGREES
    longitude = satellite.degreesLong(longitude);
    latitude = satellite.degreesLat(latitude);

    return {longitude, latitude, height};
}

function LLHtoECEF(lat, lon, alt) {
    const rad = 6378137.0;       // Radius of the Earth (in meters)
    const f = 1.0 / 298.257223563;  // Flattening factor WGS84 Model
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const FF = (1.0 - f) * (1.0 - f);
    const C = 1 / Math.sqrt(cosLat * cosLat + FF * sinLat * sinLat);
    const S = C * FF;

    const x = (rad * C + alt) * cosLat * Math.cos(lon);
    const y = (rad * C + alt) * cosLat * Math.sin(lon);
    const z = (rad * S + alt) * sinLat;

    return {x, y, z};
}