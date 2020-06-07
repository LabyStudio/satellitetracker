let debugIss = null;
let debugVelocity = null;
let debugGroup = new THREE.Object3D();

function createDebugScene(camera) {
    // Create scene
    const scene = new THREE.Scene();
    debugGroup.position.z = -4;
    scene.add(debugGroup);

    let geometry = new THREE.SphereBufferGeometry(1, 32, 32);
    let material = new THREE.MeshPhongMaterial({color: 0xffffff, transparent: true, opacity: 0.7});
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

function updateDebug(time) {
    let prevTime = new Date(time.getTime() - 1000 * 60);

    let {latitude: issLat, longitude: issLon, height: issHeight, velocity: issVelocity} = getPositionOfISS(time);
    let {latitude: prevIssLat, longitude: prevIssLon} = getPositionOfISS(prevTime);
    let heightOfIssInMeters = issHeight * 1000;

    //issLat = 10;
   // issLon = (time / 1000) % 10000;

    let pos = latLonToVector3(issLat * (Math.PI / 180), (issLon + 90) * (Math.PI / 180)).multiplyScalar(1.1);
    debugIss.position.set(pos.x, pos.y, pos.z);

    let prevPos = latLonToVector3(prevIssLat * (Math.PI / 180), (prevIssLon + 90) * (Math.PI / 180)).multiplyScalar(1.1);
    debugVelocity.position.set(prevPos.x, prevPos.y, prevPos.z);

    // Lookat solution
    //debugIss.lookAt(prevPos);

    // Matrix solution
    let targetMatrix = new THREE.Matrix4().setPosition(pos);
    targetMatrix.lookAt(pos, prevPos, new THREE.Vector3( 0, 1, 0 ));
    let a = targetMatrix.extractRotation(targetMatrix);
    debugIss.rotation.set(a.x, a.y, a.z);
    //let vec = new THREE.Vector3().subVectors(pos, prevPos);


    //debugIss.rotation.x = issVelocityVector.x * (Math.PI / 180);
    //debugIss.rotation.y = issVelocityVector.y * (Math.PI / 180);
    //debugIss.rotation.z = issVelocityVector.z * (Math.PI / 180);

    debugGroup.rotation.y = (-issLon + 90) * (Math.PI / 180);
    debugGroup.rotation.x = (-issLat + 90 + 90) * (Math.PI / 180);
}

