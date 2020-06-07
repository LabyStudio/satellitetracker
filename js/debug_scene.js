let debugIss = null;
let debugVelocity = null;
let debugGroup = new THREE.Object3D();

function createDebugScene(camera) {
    // Create scene
    const scene = new THREE.Scene();
    debugGroup.position.z = -2;
    scene.add(debugGroup);

    let geometry = new THREE.SphereBufferGeometry(1, 32, 32);
    let material = new THREE.MeshPhongMaterial({color: 0xffffff, transparent: true, opacity: 0.9});
    let earth = new THREE.Mesh(geometry, material);
    material.map = THREE.ImageUtils.loadTexture('assets/img/earth_map.jpg');
    debugGroup.add(earth);

    geometry =  new THREE.PlaneGeometry( 0.1, 0.05 );
    material = new THREE.MeshPhongMaterial({color: 0x00ffff, side: THREE.DoubleSide});
    debugIss = new THREE.Mesh(geometry, material);
    debugGroup.add(debugIss);

    geometry =  new THREE.PlaneGeometry( 0.04, 0.04 );
    material = new THREE.MeshPhongMaterial({color: 0xff2222, side: THREE.DoubleSide});
    debugVelocity = new THREE.Mesh(geometry, material);
    debugGroup.add(debugVelocity);

    return scene;
}

function updateDebug(debugScene, camera, date) {
    debugScene.rotation.x = camera.rotation.x;
    debugScene.rotation.y = camera.rotation.y;
    debugScene.rotation.z = camera.rotation.z;
    debugScene.position.x = camera.position.x;
    debugScene.position.y = camera.position.y;
    debugScene.position.z = camera.position.z;

    // Get current data and previous data
    let {latitude: latitude, longitude: longitude, height: height, velocity: velocity, rotation: issRotation, position : issPosition} = getPositionAndRotationOfISS(date);

    debugIss.position.set(issPosition.x, issPosition.y, issPosition.z);
    debugIss.rotation.set(issRotation.x, issRotation.y, issRotation.z);

    debugGroup.rotation.x = (-latitude + 90 + 90) * (Math.PI / 180);
    debugGroup.rotation.y = (-longitude + 90) * (Math.PI / 180);
}

