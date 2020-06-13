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

    if (initialized) {
        drawTelemetry(0, height - 150, 500, 150, date);
    } else {
        let status = (initializePercentage < 100 ? "Loading resources " + Math.round(initializePercentage) + "%" : "Initializing...");
        drawText(width / 2, height / 2, status, '#ffffff', 30, true, false);
        drawProgressbar(width / 2 - 100, height / 2 + 30, 200, 3, initializePercentage);
    }
}

function drawProgressbar(x, y, width, height, percentage) {
    let progress = width / 100 * percentage;

    drawRect(x + progress, y, x + width, y + height, '#444444')
    drawRect(x, y, x + progress, y + height, '#aa0000')
}

function drawTelemetry(x, y, width, height, date) {
    // Get ISS data
    let {latitude: latitude, longitude: longitude, height: heightInKm, velocity: velocity} = getPositionOfISS(date);
    let speed = velocityToSpeed(velocity) * 3.6;

    let gradient = getGradientTopBottom(x, y, y + height, "rgba(0,0,0, 0.5)", "rgba(0,0,0, 0.2)");
    let curveStartX = x + width * 0.6;

    drawRect(x, y, curveStartX, y + height, gradient);
    drawSpeedometerBackgroundCurve(curveStartX, y, width - curveStartX, height, gradient);

    drawSpeedometer(x + 100, y + 100, speed, 30000, "SPEED", "KM/H");
    drawSpeedometer(x + 280, y + 100, heightInKm, 460, "ALTITUDE", "KM");
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
    drawArc(x, y, radius - 3, arcStart - 1, arcStart + 1, 12, '#ffffff');

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
    context.font = (bold ? "bold" : "normal") + " " + size + "px FoundryGridnik";
    context.fillStyle = color;
    context.textAlign = centered ? "center" : "left";
    context.fillText(string, x, y);
}

function drawRect(left, top, right, bottom, color, alpha = 1) {
    context.fillStyle = color;
    context.globalAlpha = alpha;
    context.fillRect(left, top, right - left, bottom - top);
    context.globalAlpha = alpha;
}

function getGradientTopBottom(x, y1, y2, topColor, bottomColor) {
    const gradient = context.createLinearGradient(x, y1, x, y2);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);
    return gradient;
}

function drawSpeedometerBackgroundCurve(x, y, width, height, color) {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(x, y);

    let x1 = x;
    let y1 = y;
    let x2 = x + width;
    let y2 = y + height;
    let ang1 = 0;
    let ang2 = toRadians(90);

    let len =  Math.hypot(x2-x1,y2-y1);
    let ax1 = Math.cos(ang1) * len * (1/3);
    let ay1 = Math.sin(ang1) * len * (1/3);
    let ay2 = Math.sin(ang2) * len * (1/3);

    context.bezierCurveTo(
        x1 + ax1, y1 + ay1,
        x2 - ax1, y2 - ay2,
        x2, y2
    );

    context.lineTo(x, y + height);
    context.closePath();
    context.fill();
}