window.SatelliteModel = class {
    static get EMPTY_LOAD_CALLBACK() {
        return function (loaded, progress) {
        };
    }

    static get EMPTY_ANIMATION_CALLBACK() {
        return function (model, date, satellite) {
        };
    }

    constructor(satelliteTracker, id, state, name = "Unknown",
                callback = SatelliteModel.EMPTY_LOAD_CALLBACK,
                port = null,
                animationCallback = SatelliteModel.EMPTY_ANIMATION_CALLBACK) {
        this.satelliteTracker = satelliteTracker;

        // Data
        this.name = name;
        this.port = port;

        // Animation callback to modify the offset and the rotation
        this.animationCallback = animationCallback;
        this.object = null;

        // Scene group
        this.label = new THREE.Object3D();
        this.model = new THREE.Object3D();

        // Get instance to access it in functions
        let scope = this;

        let successCallback = function (gltf) {
            scope.model.add(scope.object = gltf.scene);

            // Shift model to the right docking port
            if (port != null) {
                scope.shift(port.offset, port.rotation);
            }

            // Report that the model was loaded
            callback(true, 100);
        };

        // Load model
        this.loadModel(id, state, successCallback, callback, function (error) {

            // Load pointer
            $.get('assets/models/' + id + '/pointer.id', function (data, status) {

                // Load pointed model
                scope.loadModel(data, state, successCallback, callback, function (error) {

                });
            }).fail(function () {

                // Load default model
                scope.loadModel("default", "default", successCallback, callback, function (error) {
                    console.log("Error while loading default model");
                    console.log(error);
                });
            });
        });

        // Name of the satellite
        const labelName = new THREE_Text2D.SpriteText2D("      " + name, {
            align: THREE_Text2D.textAlign.left,
            font: 'bold 40px Arial',
            fillStyle: '#ffffff',
            antialias: true
        })
        labelName.material.sizeAttenuation = false;
        labelName.scale.set(0.0003, 0.0003, 1);
        this.label.add(labelName);

        // Marker circle
        const markerTextureMap = satelliteTracker.textureLoader.load("assets/img/marker.png");
        const markerMaterial = new THREE.SpriteMaterial({
            map: markerTextureMap,
            color: 0xffffff,
            sizeAttenuation: false
        });
        this.marker = new THREE.Sprite(markerMaterial);
        this.marker.scale.set(0.02, 0.02, 1);
        this.label.add(this.marker);

        // Prediction line
        const predictionLineGeometry = new THREE.BufferGeometry();
        const predictionLineMaterial = new THREE.LineBasicMaterial({color: 0xffffff});
        this.predictionLine = new THREE.Line(predictionLineGeometry, predictionLineMaterial);
    }

    update(date, posAndRot, showLabels, satellite, focused, showModel) {
        this.animationCallback(this, date, satellite);

        // Set the absolute position and the rotation of the label
        this.label.position.set(posAndRot.position.x, posAndRot.position.y, posAndRot.position.z);
        this.label.rotation.set(posAndRot.rotation.x, posAndRot.rotation.y, posAndRot.rotation.z);

        // Apply the absolute position and the rotation to the model
        this.model.position.copy(this.label.position);
        this.model.rotation.copy(this.label.rotation);

        // Visible range of the focused satellite
        this.predictionLine.visible = showLabels;
        this.label.visible = showLabels;
        this.model.visible = showModel;

        // Calculate prediction line
        if (showLabels) {
            let points = [];
            for (let i = 0; i <= ISS_ORBIT_TIME; i += 1) {
                let timeToPredict = new Date(date.getTime() + 1000 * 60 * i);

                // Get data at this prediction time
                let state = satellite.getPositionAtTime(timeToPredict);

                // Get position at this prediction time
                let position = latLonDegToVector3(state.latitude, state.longitude + 90, state.getDistanceToEarthCenter());
                points.push(position);
            }
            this.predictionLine.geometry.setFromPoints(points);
            this.predictionLine.material.color.setHex(focused ? 0x66A3FF : 0xFFFFFF);
        }
    }

    loadModel(id, state, successCallback, progressCallback, errorCallback) {
        this.satelliteTracker.gltfLoader.load('assets/models/' + id + '/' + state + '.glb', successCallback, function (xhr) {
            // Report the model loading progress
            progressCallback(false, 100 / xhr.total * xhr.loaded);
        }, function (error) {
            errorCallback(error);
        });
    }

    addModels(parentGroup, foreground, addLabels) {
        foreground.add(this.model);

        if (addLabels) {
            parentGroup.add(this.label);
            parentGroup.add(this.predictionLine);
        }
    }

    destroyModels(parentGroup, foreground) {
        foreground.remove(this.model);
        parentGroup.remove(this.label);
        parentGroup.remove(this.predictionLine);
    }

    shift(offset, rotation) {
        if (this.object != null) {
            this.object.position.copy(offset);
            this.object.rotation.set(rotation.x, rotation.y, rotation.z);
        }
        return this;
    }
}