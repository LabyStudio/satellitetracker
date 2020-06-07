// Vars
const EARTH_RADIUS = 6_378_137;
const ATMOSPHERE_HEIGHT = 80_000;
const SUN_DISTANCE = 151_840_000_000;

let cameraState = 0;

let iss = null;
let sunContainer = new THREE.Object3D();
let earth = null;
let atmosphere = null;
let earthContainer = new THREE.Object3D();

// Add sun to earth container
earthContainer.add(sunContainer)

function createSpaceScene(camera) {
    // Create scene
    const scene = new THREE.Scene();
    scene.add(earthContainer);

    // Ambient Light
    const light = new THREE.AmbientLight(0x888888, debug ? 3.2 : 0.2);
    scene.add(light);

    // Sun
    const reflectionLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunContainer.add(reflectionLight);

    // Earth
    const earthGeometry = new THREE.SphereBufferGeometry(EARTH_RADIUS, 32, 32);
    const earthMaterial = new THREE.MeshPhongMaterial({color: 0xffffff});
    earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earthMaterial.map = THREE.ImageUtils.loadTexture('assets/img/earth_map.jpg');
    earthMaterial.map.minFilter = THREE.LinearFilter;
    earthMaterial.bumpMap = THREE.ImageUtils.loadTexture('assets/img/earth_bump.jpg');
    earthMaterial.bumpScale = 10000;
    earthMaterial.specularMap = THREE.ImageUtils.loadTexture('assets/img/earth_spec.jpg');
    earthMaterial.specular = new THREE.Color(0x050505);
    earthMaterial.shininess = 100;
    earth.castShadow = true;
    earth.receiveShadow = true;
    earthContainer.add(earth);

    // Atmosphere
    const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS + ATMOSPHERE_HEIGHT, 256, 256)
    createAtmosphereMaterial(function (atmosphereMaterial) {
        atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        earthContainer.add(atmosphere);
    });

    // Stars
    const starsGeometry = new THREE.SphereBufferGeometry(EARTH_RADIUS * 3, 32, 32);
    const starsMaterial = new THREE.MeshPhongMaterial();
    const stars = new THREE.Mesh(starsGeometry, starsMaterial);
    starsMaterial.map = THREE.ImageUtils.loadTexture('assets/img/galaxy_starfield.png');
    starsMaterial.side = THREE.BackSide;
    earthContainer.add(stars);

    // ISS
    const loader = new THREE.GLTFLoader();
    loader.load('assets/objects/ISS_stationary.glb', function (gltf) {
        scene.add(iss = gltf.scene);
        camera.updateProjectionMatrix();
    }, function (xhr) {
    }, function (error) {
        console.error(error);
    });


    // #############################################################
    // ------------------------- RENDERING -------------------------
    // #############################################################

    // Init
    updateSpace(new Date());

    return scene;
}

function updateSpace(date) {
    // Calculate iss position
    if (iss != null) {
        // The ISS stays at position 0 0 0 but the earth is relative to the ISS, so using the ISS position for the earth.
        let {latitude: latitude, longitude: longitude, height: height, velocity: velocity, rotation: rotation, position: position} = getPositionAndRotationOfISS(date);
        let totalHeightInMeters = EARTH_RADIUS + height * 1000;

        // Update the position everything inside of the earth container
        earthContainer.position.set(0, -totalHeightInMeters, 0);

        // Update the rotation of the earth (Actual ISS position)
        earth.rotation.x = toRadians(-latitude + 90);
        earth.rotation.y = toRadians(-longitude + 90);

        // Rotate the iss into the right direction
        iss.rotation.set(0, toRadians(-90) - rotation.y, 0);

        // TODO: Based on which axis the iss is flying, the rotaiton x/y/z is used differently. We have to find a way to include all 3 axis for the rotation (maybe subtract the earth rotation?)

        // Rotate the camera with the rotation of the iss (Auto follow)
        // spaceScene.rotation.set(0, rotation.y, 0);
    }

    // Calculate sun position
    let {lng: sunLon, lat: sunLat} = getPositionOfSun(date);
    let sunPosition = latLonToVector3(sunLat, sunLon).multiplyScalar(SUN_DISTANCE);
    sunContainer.position.set(sunPosition.x, sunPosition.y, sunPosition.z);
}

function updateCameraAndControls(camera, controls) {
    let radius = controls.getRadius();
    let hasFocusOnIss = radius < Math.max(-earth.position.y, EARTH_RADIUS);

    // Update near rendering distance
    updateNearDistance(camera, radius);

    controls.minDistance = 10;
    controls.maxDistance = EARTH_RADIUS * 3;
    controls.zoomSpeed = radius < 200 || radius >= EARTH_RADIUS ? 1 : 8;

    if (iss != null) {
        updateCameraTarget(camera, controls, hasFocusOnIss);

        if (atmosphere != null) {
            // The camera vector
            let cameraVector = new THREE.Vector3(camera.matrix.elements[8], camera.matrix.elements[9], camera.matrix.elements[10]);

            // Calculate a perfect vector over the horizon
            let dummyCameraPosition = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
            let dummyPosition = dummyCameraPosition.clone();
            dummyPosition.add(cameraVector.clone().multiplyScalar(-1));
            dummyPosition.y = dummyCameraPosition.y - 1.0;
            let fixedIssViewVector = new THREE.Vector3().subVectors(camera.position, dummyPosition);

            // Looking straight to earth or over the horizon
            atmosphere.material.uniforms.viewVector.value = hasFocusOnIss ? fixedIssViewVector : cameraVector;
        }
    }
}

function updateCameraTarget(camera, controls, hasFocusOnIss) {
    if (cameraState === 0) {
        if (!hasFocusOnIss) {
            // Called when the camera moves out of the iss
            cameraState = 1;

            // Change target
            controls.target = earthContainer.position;

            // Update
            camera.updateProjectionMatrix();
        }
    } else {
        if (hasFocusOnIss) {
            // Called when the camera moved back into the iss
            cameraState = 0;

            // Change target
            controls.target = new THREE.Vector3(0, 0, 0);

            // Set camera position above the ISS
            camera.position.x = earthContainer.position.x;
            camera.position.y = 3000;
            camera.position.z = earthContainer.position.z;

            // Update
            camera.updateProjectionMatrix();
        }
    }
}

function updateNearDistance(camera, radius) {
    let prevCameraNear = camera.near;
    camera.near = radius < 10000 ? 1 : 100000;

    if (prevCameraNear !== camera.near) {
        camera.updateProjectionMatrix();
    }
}


function createAtmosphereMaterial(callback) {
    const loader = new THREE.FileLoader();
    loader.load("assets/shaders/atmosphere.frag", function (fragmentShader) {
        loader.load("assets/shaders/atmosphere.vert", function (vertexShader) {
            const material = new THREE.ShaderMaterial({
                uniforms:
                    {
                        "c": {
                            type: "f",
                            value: 0.6
                        },
                        "p": {
                            type: "f",
                            value: 0.9
                        },
                        glowColor: {
                            type: "c",
                            value: new THREE.Color(0x47AEF7)
                        },
                        viewVector: {
                            type: "v3",
                            value: new THREE.Vector3(0, 0, 0)
                        }
                    },
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                side: THREE.FrontSide,
                blending: THREE.AdditiveBlending,
                transparent: true
            });

            callback(material);
        });
    });
}