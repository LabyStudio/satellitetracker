let context = null;
let hudTexture = null;
let planeGeometry = null;

function createHUDScene(hudCanvas, cameraHUD) {
    initHUDSize(hudCanvas, cameraHUD)

    let width = hudCanvas.width;
    let height = hudCanvas.height;

    // Get context
    context = hudCanvas.getContext('2d');

    // Create also a custom scene for HUD.
    const sceneHUD = new THREE.Scene();

    // Create texture from rendered graphics.
    hudTexture = new THREE.Texture(hudCanvas)
    hudTexture.needsUpdate = true;

    // Create HUD material.
    const material = new THREE.MeshBasicMaterial({map: hudTexture});
    material.map.minFilter = THREE.LinearFilter;
    material.transparent = true;

    // Create plane to render the HUD. This plane fill the whole screen.
    planeGeometry = new THREE.PlaneGeometry(width, height);
    const plane = new THREE.Mesh(planeGeometry, material);
    sceneHUD.add(plane);

    return sceneHUD;
}

function initHUDSize(hudCanvas, cameraHUD) {
    let width = window.innerWidth;
    let height = window.innerHeight;

    hudCanvas.width = width;
    hudCanvas.height = height;

    cameraHUD.left = -width / 2;
    cameraHUD.right = width / 2;
    cameraHUD.top = height / 2;
    cameraHUD.bottom = -height / 2;
    cameraHUD.updateProjectionMatrix();
}

function updateHUD(date) {
    // Not initialized yet
    if (context == null || hudTexture == null)
        return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    // Clear & update screen
    context.clearRect(0, 0, width, height);
    hudTexture.needsUpdate = true;

    if(initialized) {
        // Get ISS data
        let {latitude: latitude, longitude: longitude, height: heightInKm, velocity: velocity} = getPositionOfISS(date);
        let speed = velocityToSpeed(velocity) * 3.6;

        drawSpeedometer(100, height - 50, speed, 30000, "SPEED", "KM/H");
        drawSpeedometer(280, height - 50, heightInKm, 460, "ALTITUDE", "KM");
    } else {
        drawText(width / 2, height / 2, "Loading space...", '#ffffff', 30, true, false);
    }
}

function drawSpeedometer(x, y, value, maxValue, title, unit) {
    let arcOffset = 18;
    let arcStart = -arcOffset;
    let arcEnd = 180 + arcOffset;
    let arcThickness = 6;
    let arcRedRange = 35;
    let radius = 75;
    let initializationDuration = 2000;

    // Initialize animation
    let timePassed = new Date().getTime() - initializeTime;
    let initializeProgress = sigmoid(Math.max(0, Math.min(1, timePassed / initializationDuration)) * 10);

    // Progress position
    let arcTotalRange = Math.abs(arcEnd) + Math.abs(arcStart);
    let arcRange = Math.min(arcTotalRange, (arcTotalRange - arcRedRange) / maxValue * value * initializeProgress);
    let arcWhiteProgress = Math.min(arcTotalRange - arcRedRange, arcRange);
    let arcRedProgress = Math.max(arcTotalRange - arcRedRange, arcRange) - (arcTotalRange - arcRedRange);

    // Track line
    drawArc(x, y, radius, arcStart + arcWhiteProgress, arcEnd - arcRedRange, arcThickness, '#888888');
    drawArc(x, y, radius, arcEnd - arcRedRange + arcRedProgress, arcEnd, arcThickness, '#aa0000');

    // Progress
    drawArc(x, y, radius, arcStart, arcStart + arcWhiteProgress, arcThickness, '#ffffff');
    drawArc(x, y, radius, arcEnd - arcRedRange, arcEnd - arcRedRange + arcRedProgress, arcThickness, '#ffaaaa');

    // Draw start hook
    drawArc(x, y, radius - 3, arcStart - 2, arcStart + 1, 13, '#ffffff');

    // Labels
    drawText(x, y - 35, title, '#999999', 12, true, true);
    drawText(x, y + 8, Math.round(value * initializeProgress), '#ffffff', 45, true, false);
    drawText(x, y + 30, unit, '#999999', 12, true, true);
}

function drawArc(x, y, radius, degreeStart, degreeEnd, thickness, color) {
    context.beginPath();
    context.arc(x, y, radius, (Math.PI / 180) * (degreeStart + 180), (Math.PI / 180) * (degreeEnd + 180));
    context.strokeStyle = color;
    context.lineJoin = 'round';
    context.lineWidth = thickness;
    context.stroke();
}

function drawText(x, y, string, color, size, centered, bold) {
    context.font = (bold ? "bold" : "normal") + " " + size + "px Arial";
    context.fillStyle = color;
    context.textAlign = centered ? "center" : "left";
    context.fillText(string, x, y);
}