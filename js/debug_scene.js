let debugIss = null;
let debugVelocity = null;
let debugGroup = new THREE.Object3D();

function createDebugScene(camera) {
    // Create scene
    const scene = new THREE.Scene();
    debugGroup.position.z = -6;
    debugGroup.position.x = 4;
    debugGroup.position.y = -1.5;
    scene.add(debugGroup);

    let geometry = new THREE.SphereBufferGeometry(1, 32, 32);
    let material = new THREE.MeshPhongMaterial({color: 0xffffff, transparent: true, opacity: 0.9});
    let earth = new THREE.Mesh(geometry, material);
    material.map = THREE.ImageUtils.loadTexture('assets/img/earth_map.jpg');
    debugGroup.add(earth);

    geometry = new THREE.PlaneGeometry(0.04, 0.04);
    material = new THREE.MeshPhongMaterial({color: 0xff2222, side: THREE.DoubleSide});
    debugVelocity = new THREE.Mesh(geometry, material);
    debugGroup.add(debugVelocity);

    const loader = new THREE.GLTFLoader();
    loader.load('assets/objects/ISS_stationary.glb', function (gltf) {
        debugGroup.add(debugIss = gltf.scene);
        debugIss.scale.set(0.001, 0.001, 0.001);
        camera.updateProjectionMatrix();
    }, function (xhr) {
    }, function (error) {
        console.error(error);
    });

    return scene;
}

function updateDebug(debugScene, camera, date) {
    debugScene.rotation.x = camera.rotation.x;
    debugScene.rotation.y = camera.rotation.y;
    debugScene.rotation.z = camera.rotation.z;
    debugScene.position.x = camera.position.x;
    debugScene.position.y = camera.position.y;
    debugScene.position.z = camera.position.z;

    if (debugIss == null)
        return;

    // Get current data and previous data
    let {latitude: latitude, longitude: longitude, totalHeight: height, velocity: velocity, rotation: issRotation, position: issPosition} = getPositionAndRotationOfISS(date);

    debugIss.position.set(issPosition.x / height, issPosition.y / height, issPosition.z / height);
    debugIss.rotation.set(issRotation.x, issRotation.y, issRotation.z);

    debugGroup.rotation.x = (-latitude + 90 + 90) * (Math.PI / 180);
    debugGroup.rotation.y = (-longitude + 90) * (Math.PI / 180);
}

