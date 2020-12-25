window.Port = class {
    constructor(name, offsetX, offsetY, offsetZ, rotationX, rotationY, rotationZ) {
        this.name = name;
        this.offset = new THREE.Vector3(offsetX, offsetY, offsetZ);
        this.rotation = new THREE.Vector3(toRadians(rotationX), toRadians(rotationY), toRadians(rotationZ));
    }
}
