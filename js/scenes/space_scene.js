let cameraState = 0;

let sunGroup = new THREE.Object3D();
let earthGroup = new THREE.Object3D();
let centerGroup = new THREE.Object3D();
let issGroup = new THREE.Object3D();
let issLabelGroup = new THREE.Object3D();

let iss = null;
let earth = null;
let atmosphere = null;
let moon = null;

function createSpaceScene(camera, controls) {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = "";

    // Create space scene
    const scene = new THREE.Scene();

    // Bindings
    scene.add(centerGroup);
    earthGroup.add(sunGroup)
    centerGroup.add(earthGroup);
    earthGroup.add(issGroup);
    issGroup.add(issLabelGroup);

    // Ambient Light
    const nightLight = new THREE.AmbientLight(0x888888, debug ? 3.2 : 0.2);
    scene.add(nightLight);

    // Sun light
    const reflectionLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunGroup.add(reflectionLight);

    // Moon
    const moonGeometry = new THREE.SphereBufferGeometry(MOON_RADIUS, 32, 32);
    const moonMaterial = new THREE.MeshPhongMaterial({color: 0xffffff});
    moon = new THREE.Mesh(moonGeometry, moonMaterial);
    earthGroup.add(moon);

    // Add sun flare
    let textureFlareLens = textureLoader.load("assets/img/lensflares/lens_flare.png");
    let textureFlareSun = textureLoader.load("assets/img/lensflares/sun_flare.png");
    let lensflare = new THREE.Lensflare();
    lensflare.addElement(new THREE.LensflareElement(textureFlareSun, 160, 0.0));
    lensflare.addElement(new THREE.LensflareElement(textureFlareLens, 60, 0.6));
    lensflare.addElement(new THREE.LensflareElement(textureFlareLens, 70, 0.7));
    lensflare.addElement(new THREE.LensflareElement(textureFlareLens, 120, 0.9));
    lensflare.addElement(new THREE.LensflareElement(textureFlareLens, 70, 1));
    reflectionLight.add(lensflare);

    // Earth
    const earthGeometry = new THREE.SphereBufferGeometry(EARTH_RADIUS, 32, 32);
    const earthMaterial = new THREE.MeshPhongMaterial({color: 0xffffff});
    earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earthMaterial.map = textureLoader.load('assets/img/earth_map.jpg');
    earthMaterial.map.minFilter = THREE.LinearFilter;
    earthMaterial.bumpMap = textureLoader.load('assets/img/earth_bump.jpg');
    earthMaterial.specularMap = textureLoader.load('assets/img/earth_spec.jpg');
    earthMaterial.specular = new THREE.Color(0x050505);
    earthMaterial.shininess = 10;
    earth.castShadow = true;
    earth.receiveShadow = true;
    earthGroup.add(earth);

    // Atmosphere
    const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS + ATMOSPHERE_HEIGHT, 256, 256)
    createAtmosphereMaterial(function (atmosphereMaterial) {
        atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        atmosphere.castShadow = true;
        atmosphere.receiveShadow = true;
        centerGroup.add(atmosphere);
    });

    // Stars
    const starsGeometry = new THREE.SphereBufferGeometry(SUN_DISTANCE * 2, 32, 32);
    const starsMaterial = new THREE.MeshBasicMaterial();
    const stars = new THREE.Mesh(starsGeometry, starsMaterial);
    starsMaterial.map = textureLoader.load('assets/img/galaxy_starfield.jpg');
    starsMaterial.side = THREE.BackSide;
    centerGroup.add(stars);

    // ISS
    const loader = new THREE.GLTFLoader();
    loader.load('assets/objects/ISS_stationary.glb', function (gltf) {
        issGroup.add(iss = gltf.scene);
        camera.updateProjectionMatrix();
    }, function (xhr) {
    }, function (error) {
        console.error(error);
    });

    // ISS label
    const label = new THREE_Text2D.SpriteText2D("   International Space Station", {
        align: THREE_Text2D.textAlign.left,
        font: '40px Arial',
        fillStyle: '#ffffff',
        antialias: true
    })
    label.material.sizeAttenuation = false;
    label.scale.set(0.0003, 0.0003, 1);
    issLabelGroup.add(label);

    // ISS marker
    const markerTextureMap = textureLoader.load("assets/img/marker.png");
    const markerMaterial = new THREE.SpriteMaterial({map: markerTextureMap, color: 0xffffff, sizeAttenuation: false});
    const marker = new THREE.Sprite(markerMaterial);
    marker.scale.set(0.01, 0.015, 1);
    issLabelGroup.add(marker);

    // Init
    updateSpace(new Date());

    controls.minDistance = 10;
    controls.maxDistance = EARTH_RADIUS * 8;

    return scene;
}

function updateSpace(date) {
    // Get ISS data
    let {
        latitude: latitude,
        longitude: longitude,
        totalHeight: totalHeight,
        rotation: rotation,
        position: position
    } = getPositionAndRotationOfISS(date);

    // Update the position everything inside of the earth container
    centerGroup.position.set(0, -totalHeight, 0);

    // Rotate the earth with the ISS position to the top
    earthGroup.rotation.x = toRadians(-latitude + 90);
    earthGroup.rotation.y = toRadians(-longitude + 90);

    // Set the absolute position and the rotation of the iss group
    issGroup.position.set(position.x, position.y, position.z);
    issGroup.rotation.set(rotation.x, rotation.y, rotation.z);

    // Calculate sun position
    let {
        lng: sunLonRad,
        lat: sunLatRad
    } = getPositionOfSun(date)
    let sunPosition = latLonRadToVector3(sunLatRad, sunLonRad + toRadians(90), SUN_DISTANCE);
    sunGroup.position.set(sunPosition.x, sunPosition.y, sunPosition.z);

    // Calculate moon position
    let {
        longitude: moonLon,
        latitude: moonLat,
        distance: moonDistance
    } = getMoonPosition(date);
    let moonPosition = latLonRadToVector3(moonLat, moonLon + toRadians(90), moonDistance * 1000);
    moon.position.set(moonPosition.x, moonPosition.y, moonPosition.z);
}

function updateCameraAndControls(camera, controls) {
    let radius = controls.getRadius();
    let hasFocusOnIss = radius < Math.max(-earth.position.y, EARTH_RADIUS * 1.3);
    let canSeeIss = radius < 10000;

    controls.zoomSpeed = radius < 200 || radius >= EARTH_RADIUS ? 1 : 8;

    // Label of the ISS
    issLabelGroup.visible = !canSeeIss;

    // Update near rendering distance
    updateNearDistance(camera, radius);

    if (iss != null) {
        updateCameraTarget(camera, controls, hasFocusOnIss);
    }

    if (atmosphere != null) {
        updateAtmosphere(camera, hasFocusOnIss);
    }
}

function updateAtmosphere(camera, hasFocusOnIss) {
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

function updateCameraTarget(camera, controls, hasFocusOnIss) {
    if (cameraState === 0) {
        if (!hasFocusOnIss) {
            // Called when the camera moves out of the iss
            cameraState = 1;

            // Change target
            controls.target = centerGroup.position;

            // High terrain height map resolution
            earth.material.bumpScale = 10000;

            // Update
            camera.updateProjectionMatrix();
        }
    } else {
        if (hasFocusOnIss) {
            // Called when the camera moved back into the iss
            cameraState = 0;

            // Change target
            controls.target = new THREE.Vector3(0, 0, 0);

            // Low terrain height map resolution
            earth.material.bumpScale = 1000;

            // Set camera position above the ISS
            let teleportRequired = camera.position.x !== centerGroup.position.x || camera.position.z !== centerGroup.position.z;
            if (teleportRequired) {
                camera.position.x = centerGroup.position.x;
                camera.position.y = 3000;
                camera.position.z = centerGroup.position.z;
            }

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
                uniforms: THREE.UniformsUtils.merge([
                    THREE.UniformsLib.shadowmap,
                    THREE.UniformsLib.lights,
                    THREE.UniformsLib.ambient,
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
                    }]),
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                side: THREE.FrontSide,
                blending: THREE.AdditiveBlending,
                transparent: true,
                lights: true
            });

            callback(material);
        });
    });
}