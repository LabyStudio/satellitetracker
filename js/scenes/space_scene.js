let sunGroup = new THREE.Object3D();
let earthGroup = new THREE.Object3D();
let centerGroup = new THREE.Object3D();

let sunForeground = null;

let earth = null;
let atmosphere = null;
let moon = null;
let clouds = null;

// Loaders
const textureLoader = new THREE.TextureLoader();
const gltfLoader = new THREE.GLTFLoader();

function createSpaceScene(camera, controls) {
    textureLoader.crossOrigin = "";

    // Create space scene
    const background = new THREE.Scene();
    const foreground = new THREE.Scene();

    // Bindings
    background.add(centerGroup);
    earthGroup.add(sunGroup)
    centerGroup.add(earthGroup);

    // Ambient Light
    const nightLight = new THREE.AmbientLight(0x888888, debug ? 3.2 : 0.2);
    background.add(nightLight);
    // Copy night light to foreground for lightning
    foreground.add(nightLight.clone());

    // Sun light
    const reflectionLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunGroup.add(reflectionLight);
    // Copy sun to foreground for lightning
    foreground.add(sunForeground = reflectionLight.clone());

    // Moon
    const moonGeometry = new THREE.SphereBufferGeometry(MOON_RADIUS, 32, 32);
    const moonMaterial = new THREE.MeshPhongMaterial({color: 0xffffff});
    moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moonMaterial.map = textureLoader.load('assets/img/moon_map.jpg');
    centerGroup.add(moon);

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
    const earthGeometry = new THREE.SphereBufferGeometry(EARTH_RADIUS, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({color: 0xffffff});
    earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earthMaterial.map = textureLoader.load('assets/img/earth_map.jpg');
    earthMaterial.map.minFilter = THREE.LinearFilter;
    earthMaterial.bumpMap = textureLoader.load('assets/img/earth_bump.jpg');
    earthMaterial.specularMap = textureLoader.load('assets/img/earth_spec.jpg');
    earthMaterial.specular = new THREE.Color(0x050505);
    earthMaterial.shininess = 10;
    earthMaterial.polygonOffset = true;
    earthMaterial.polygonOffsetFactor = 2;
    earth.castShadow = true;
    earth.receiveShadow = true;
    earthGroup.add(earth);

    /*
    // Invisible earth sphere in the foreground layer that casts proper shadows for the satellites
    let mat = new THREE.MeshPhongMaterial({color: 0xffffff});
    //mat.colorWrite = false;
    //mat.depthWrite = false;
    let mesh = new THREE.Mesh(new THREE.SphereBufferGeometry(EARTH_RADIUS, 10, 10), mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    foreground.add(mesh);
    */

    // Clouds
    const cloudsGeometry = new THREE.SphereBufferGeometry(EARTH_RADIUS + CLOUD_HEIGHT, 64, 64);
    const cloudsMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });
    clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    cloudsMaterial.map = textureLoader.load('assets/img/cloud_map.png');
    clouds.castShadow = true;
    clouds.receiveShadow = true;
    earthGroup.add(clouds);

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

    // Add satellite model to earth group
    createSatellites(earthGroup, foreground);

    // Init
    updateSpace(new Date(), null);

    controls.minDistance = 10;
    controls.maxDistance = EARTH_RADIUS * 8;

    // ISS default view position
    camera.position.set(20, 70, 100);

    return {background, foreground};
}

function updateSpace(date, layers) {
    let cameraDistance = controls.getRadius();
    let canSeeFocusedSatellite = cameraDistance < 10000;

    let focusedSatellite = getFocusedSatellite();
    if (focusedSatellite == null)
        return;

    // Update all satellite positions
    Object.values(satellites).forEach(satellite => {
        satellite.updateModel(date, !canSeeFocusedSatellite, satellite.id === focusedSatellite.id);
    });

    // Focus a specific satellite with the camera
    focusSatellite(date, focusedSatellite, cameraDistance, canSeeFocusedSatellite, layers);

    // Calculate sun position
    let sunState = getPositionOfSun(date);
    let sunPosition = latLonRadToVector3(sunState.lat, sunState.lng + toRadians(90), SUN_DISTANCE);
    sunGroup.position.set(sunPosition.x, sunPosition.y, sunPosition.z);

    // Update sun position in foreground
    sunForeground.position.copy(sunGroup.position);

    // Calculate moon position
    let moonState = getMoonPosition(date);
    let moonPosition = latLonRadToVector3(moonState.latitude, moonState.longitude + toRadians(90), moonState.distance * 1000);
    moon.position.set(moonPosition.x, moonPosition.y, moonPosition.z);
}

function focusSatellite(date, satellite, cameraDistance, canSeeFocusedSatellite, layers) {
    // Get data
    let advancedState = satellite.getAdvancedStateAtTime(date);

    // Update the position everything inside of the earth container
    centerGroup.position.set(0, -advancedState.state.getDistanceToEarthCenter(), 0);

    // Rotate the earth with the ISS position to the top
    earthGroup.rotation.x = toRadians(-advancedState.state.latitude + 90);
    earthGroup.rotation.y = toRadians(-advancedState.state.longitude + 90);

    // Sync position of satellites in foreground with the background
    if (layers !== null) {
        layers.foreground.position.copy(centerGroup.position);
        layers.foreground.rotation.copy(earthGroup.rotation);
    }

    // Cloud movement
    clouds.rotation.x = 0;
    clouds.rotation.y = date.getTime() / 3000000;

    // Update controls
    controls.zoomSpeed = cameraDistance < 200 || cameraDistance >= EARTH_RADIUS ? 1 : 8;
    controls.target = new THREE.Vector3(0, focusedEarth ? centerGroup.position.y : 0, 0);

    // Update bump scale of earth
    earth.material.bumpScale = cameraDistance < EARTH_RADIUS ? 1000 : 10000;

    updateAtmosphere(cameraDistance);
}

function updateAtmosphere(cameraDistance) {
    if (atmosphere == null)
        return;

    // The camera vector
    let cameraVector = new THREE.Vector3(camera.matrix.elements[8], camera.matrix.elements[9], camera.matrix.elements[10]);

    // Calculate a perfect vector over the horizon
    let dummyCameraPosition = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
    let dummyPosition = dummyCameraPosition.clone();
    dummyPosition.add(cameraVector.clone().multiplyScalar(-1));
    dummyPosition.y = dummyCameraPosition.y - 1.0;
    let fixedOverHorizonViewVector = new THREE.Vector3().subVectors(camera.position, dummyPosition);

    // Smooth transition between two view vectors based on camera zoom
    let difference = new THREE.Vector3().subVectors(fixedOverHorizonViewVector, cameraVector);
    difference.multiplyScalar(Math.min(1.0, Math.max(0, 1.0 - 1.0 / controls.maxDistance * cameraDistance * 2)));

    if (!focusedEarth) {
        cameraVector.add(difference);
    }

    // Calculate fade out for atmosphere strength
    let strength = (ATMOSPHERE_STRENGTH - ATMOSPHERE_STRENGTH / controls.maxDistance * cameraDistance) * 3 - ATMOSPHERE_STRENGTH * 1.1;

    // Looking straight to earth or over the horizon
    atmosphere.material.uniforms.viewVector.value = cameraVector;
    atmosphere.material.uniforms.c.value = Math.min(Math.max(strength, 0.0), ATMOSPHERE_STRENGTH);
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
                            value: ATMOSPHERE_STRENGTH
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