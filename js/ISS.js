class ISS {
    static get ID() {
        return 25544;
    }

    // ISS Ports
    static get PORT_RASSVET() {
        return new Port(0, -13.8, -6.9, 0, 0, 0);
    }

    static get PORT_POISK() {
        return new Port(0, 13.03, -19.9, 0, 0, 180);
    }

    static get PORT_PIRS() {
        return new Port(0, -11.55, -19.9, 0, 0, 0);
    }

    static get PORT_AFT() {
        return new Port(0, 0.8, -39.4, 90, 0, 0);
    }

    static get PORT_FORWARD() {
        return new Port(0, -0.8, 24.0, 180, 0, 180);
    }

    static get PORT_SOLAR_ARRAY_ROD() {
        return new Port(0, 0.0, 0.0, 0, 0, 0);
    }

    static createSpacecraft(tle) {
        let satellite = new Satellite(tle, function (loaded, progress) {
            initializePercentage = progress;
            if (loaded) {
                initializationCompleted();
            }
        }, "main");

        // Add solar array rod
        satellite.dock(25544, null, "solar_array_rod", function (model, date, satellite) {
            model.shift(new THREE.Vector3(0.0, 5.0, 5.0), ISS.calculateSolarArrayRotation(date, satellite, false));
        })

        // Add solar array elements
        for (let i = 0; i < 2; i++) {
            let mirror = i === 0 ? 1 : -1;

            // Outer solar array
            satellite.dock(25544, null, i === 0 ? "solar_array_left" : "solar_array_right", function (model, date, satellite) {
                model.shift(new THREE.Vector3(50.0 * mirror, 5, 5.0), ISS.calculateSolarArrayRotation(date, satellite, true));
            });

            // Inner solar array
            satellite.dock(25544, null, i === 0 ? "solar_array_left" : "solar_array_right", function (model, date, satellite) {
                model.shift(new THREE.Vector3(34.3 * mirror, 5, 5.0), ISS.calculateSolarArrayRotation(date, satellite, true));
            });
        }

        // Docking soyuz satellites
        satellite.dock(45476, ISS.PORT_POISK);
        satellite.dock(45476, ISS.PORT_RASSVET);
        satellite.dock(45623, ISS.PORT_FORWARD, "docked");

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