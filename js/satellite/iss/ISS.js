window.ISS = class {
    static get ID() {
        return 25544;
    }

    // ############### ISS Ports ###############

    // Naming: https://www.nasa.gov/sites/default/files/styles/full_width/public/thumbnails/image/iss_config_exploded_view_page_0.jpg?itok=JgPFlPWt

    // Top Node 2
    static get PORT_PMA_3() {
        return new Port("PMA 3", 0, 2.13, 16.18, 0, 180, 0);
    }

    // Space shuttle
    static get PORT_PMA_2() {
        return new Port("PMA 2",0, -0.8, 20.8, 90, 180, 0);
    }

    // Top highest
    static get PORT_MRM_2() {
        return new Port("MRM 2",0, 5.63, -19.9, 0, 0, 0);
    }

    // Bottom long extension
    static get PORT_MRM_1() {
        return new Port("MRM 1",0, -6.55, -6.9, 0, 0, 180);
    }

    // Bottom short extension
    static get PORT_DC_1() {
        return new Port("DC 1",0, -4.4, -19.9, 0, 0, 180);
    }

    // End of spacecraft
    static get PORT_AFT() {
        return new Port("AFT",0, 0.4, -32.0, 90, 0, 180);
    }

    static createSpacecraft(satelliteTracker, tle, progressCallback) {
        let satellite = new Satellite(satelliteTracker, tle, progressCallback, "main-compressed");

        // Add solar array rod
        satellite.dock(25544, "Solar Rod", null, "solar_array_rod", function (model, date, satellite) {
            model.shift(new THREE.Vector3(0.0, 5.0, 5.0), ISS.calculateSolarArrayRotation(date, satellite, false));
        })

        // Add solar array elements
        for (let i = 0; i < 2; i++) {
            let mirror = i === 0 ? 1 : -1;

            // Outer solar array
            satellite.dock(25544, "Solar Array", null, i === 0 ? "solar_array_left" : "solar_array_right", function (model, date, satellite) {
                model.shift(new THREE.Vector3(50.0 * mirror, 5, 5.0), ISS.calculateSolarArrayRotation(date, satellite, true));
            });

            // Inner solar array
            satellite.dock(25544, "Solar Array", null, i === 0 ? "solar_array_left" : "solar_array_right", function (model, date, satellite) {
                model.shift(new THREE.Vector3(34.3 * mirror, 5, 5.0), ISS.calculateSolarArrayRotation(date, satellite, true));
            });
        }

        // Docking soyuz satellites
        satellite.dock(46613, "Progress 75", ISS.PORT_AFT);
        satellite.dock(46613, "Progress 76", ISS.PORT_DC_1);
        satellite.dock(46613, "Soyuz MS-17", ISS.PORT_MRM_1);

        // Docking dragons
        //satellite.dock(46920, "Crew-1 Dragon", ISS.PORT_PMA_2);
        satellite.dock(48209, "Crew-2 Dragon", ISS.PORT_PMA_3);
        //satellite.dock(46920, "CRS-21 Cargo Dragon", ISS.PORT_PMA_3);

        return satellite;
    }

    static calculateSolarArrayRotation(date, satelliteObject, twoAxes = true) {
        let posAndRot = satelliteObject.getPositionAndRotationAtTime(date);
        let sunPosition = getPositionOfSun(date);

        // Sun position
        let sunCoordinates = latLonDegToVector3(toDegrees(sunPosition.lat), toDegrees(sunPosition.lng) + 90 - posAndRot.position.longitude + 90, 100);

        // Earth rotation
        sunCoordinates.applyAxisAngle(new THREE.Vector3(1, 0, 0), toRadians(-posAndRot.position.latitude + 90));

        // Look at the sun
        let solarArrayVector = lookAt(new THREE.Vector3(0, 0, 0), sunCoordinates);

        // Apply rotation to the models
        if (twoAxes) {
            return new THREE.Vector3(-solarArrayVector.x - Math.PI / 2, -solarArrayVector.z, 0);
        } else {
            return new THREE.Vector3(-solarArrayVector.x, 0, 0);
        }
    }
}