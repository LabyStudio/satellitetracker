let context = null;
let hudTexture = null;
let planeGeometry = null;

let textureSatellite = createImage("assets/img/hud/satellite.png");
let textureEarth = createImage("assets/img/hud/earth.png");
let texturePlus = createImage("assets/img/hud/plus.png");

let hoveredSatellite = null;
let hoverToggleEarthFocusButton = false;

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

function updateHUD(date, mouseX, mouseY) {
    // Not initialized yet
    if (context == null || hudTexture == null)
        return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    // Clear & update screen
    context.clearRect(0, 0, width, height);
    hudTexture.needsUpdate = true;

    if (initialized) {
        drawSatelliteList(3, height - 160, mouseX, mouseY);
        drawTelemetry(getFocusedSatellite(), 0, height - 150, 500, 150, date);

        drawEarthFocusButton(width - 50, height - 50, 40, mouseX, mouseY);
    } else {
        let status = (initializePercentage < 100 ? "Loading resources " + Math.round(initializePercentage) + "%" : "Initializing...");
        drawCenteredText(width / 2, height / 2, status, '#ffffff', 30, false);
        drawProgressbar(width / 2 - 100, height / 2 + 30, 200, 3, initializePercentage);
    }
}

function onClickScreen(mouseX, mouseY) {
    if (hoveredSatellite != null) {
        setFocusedSatellite(hoveredSatellite);
    }
    if (hoverToggleEarthFocusButton) {
        toggleEarthFocus();
    }
}

// ############ Earth focus button ############

function drawEarthFocusButton(x, y, size, mouseX, mouseY) {
    let mouseOver = hoverToggleEarthFocusButton = mouseX > x && mouseX < x + size && mouseY > y && mouseY < y + size;
    let offset = mouseOver ? 1 : 0;

    drawImage(focusedEarth ? textureSatellite : textureEarth, x - offset, y - offset, size + offset * 2, size + offset * 2, mouseOver ? 0.8 : 0.3);
    if (mouseOver) {
        drawRightText(x - 5, y + size / 2 + 4, "Focus " + (focusedEarth ? "Satellite" : "Earth"), '#ffffff', 20, false);
    }
}

// ############ Satellite list ############

function drawSatelliteList(x, y, mouseX, mouseY) {
    hoveredSatellite = null;

    Object.values(satellites).forEach(satellite => {
        y -= 32;
        drawSatelliteEntry(satellite, x, y, 30, mouseX, mouseY);
    });

    y -= 32;
    drawSatellitePlusButton(satellite, x, y, 30, mouseX, mouseY);
}

function drawSatelliteEntry(satellite, x, y, height, mouseX, mouseY) {
    let gap = 3;
    let fontSize = 16;

    // Define font size
    drawText(0, 0, "", '#ffffff', fontSize, false);
    let fontWidth = context.measureText(satellite.name).width;
    let width = x + height + 3 * 2 + fontWidth;

    let focused = satellite === getFocusedSatellite();
    let mouseOver = mouseX > x && mouseX < x + width && mouseY > y && mouseY < y + height;
    let gradient = getGradientTopBottom(x, y, y + height, "rgba(0,0,0, " + (mouseOver ? 0.8 : 0.3) + ")", "rgba(0,0,0, " + (mouseOver ? 0.6 : 0.2) + ")");

    if (mouseOver) {
        gap = 1;
        hoveredSatellite = satellite;
    }

    drawRect(x, y, x + width, y + height, gradient);
    drawImage(textureSatellite, x + gap, y + gap, height - gap * 2, height - gap * 2, focused ? 1.0 : 0.4);
    drawText(x + height + 3, y + height / 2 + fontSize / 2, satellite.name, "rgba(255,255,255, " + (focused ? 1.0 : 0.4) + ")", fontSize, false);
}

function drawSatellitePlusButton(satellite, x, y, height, mouseX, mouseY) {
    let width = x + height - 2;
    let mouseOver = mouseX > x && mouseX < x + width && mouseY > y && mouseY < y + height;
    let gradient = getGradientTopBottom(x, y, y + height, "rgba(0,0,0, " + (mouseOver ? 0.8 : 0.3) + ")", "rgba(0,0,0, " + (mouseOver ? 0.6 : 0.2) + ")");
    let gap = mouseOver ? 5 : 6;

    drawRect(x, y, x + width, y + height, gradient);
    drawImage(texturePlus, x + gap, y + gap, height - gap * 2, height - gap * 2, mouseOver ? 0.6 : 0.4);
}

// ############ Progressbar ############

function drawProgressbar(x, y, width, height, percentage) {
    let progress = width / 100 * percentage;

    drawRect(x + progress, y, x + width, y + height, '#444444')
    drawRect(x, y, x + progress, y + height, '#aa0000')
}


// ############ Telemetry ############

function drawTelemetry(satellite, x, y, width, height, date) {
    let state = satellite.getStateAtTime(date);

    let gradient = getGradientTopBottom(x, y, y + height, "rgba(0,0,0, 0.5)", "rgba(0,0,0, 0.2)");
    let curveStartX = x + width * 0.6;

    drawRect(x, y, curveStartX, y + height, gradient);
    drawSpeedometerBackgroundCurve(curveStartX, y, width - curveStartX, height, gradient);

    drawSpeedometer(x + 100, y + 90, state.getSpeed(), 30000, "SPEED", "KM/H");
    drawSpeedometer(x + 280, y + 90, state.altitude, 460, "ALTITUDE", "KM");

    drawCenteredText(x + 100 + (280 - 100) / 2, y + height - 8, satellite.name + " TELEMETRY", '#999999', 14, false);
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
    drawCenteredText(x, y - 35, title, '#999999', 12, true);
    drawCenteredText(x, y + 8, Math.round(value * initializeProgress), '#ffffff', 45, false);
    drawCenteredText(x, y + 30, unit, '#999999', 12, true);
}

function drawArc(x, y, radius, degreeStart, degreeEnd, thickness, color) {
    context.beginPath();
    context.arc(x, y, radius, (Math.PI / 180) * (degreeStart + 180), (Math.PI / 180) * (degreeEnd + 180));
    context.strokeStyle = color;
    context.lineJoin = 'round';
    context.lineWidth = thickness;
    context.stroke();
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

    let len = Math.hypot(x2 - x1, y2 - y1);
    let ax1 = Math.cos(ang1) * len * (1 / 3);
    let ay1 = Math.sin(ang1) * len * (1 / 3);
    let ay2 = Math.sin(ang2) * len * (1 / 3);

    context.bezierCurveTo(
        x1 + ax1, y1 + ay1,
        x2 - ax1, y2 - ay2,
        x2, y2
    );

    context.lineTo(x, y + height);
    context.closePath();
    context.fill();
}

// ############ Draw utils ############


function drawCenteredText(x, y, string, color, size, bold) {
    drawAlignmentText(x, y, string, color, size, 0, bold);
}

function drawText(x, y, string, color, size, bold) {
    drawAlignmentText(x, y, string, color, size, -1, bold);
}

function drawRightText(x, y, string, color, size, bold) {
    drawAlignmentText(x, y, string, color, size, 1, bold);
}

function drawAlignmentText(x, y, string, color, size, alignment, bold) {
    context.font = (bold ? "bold" : "normal") + " " + size + "px FoundryGridnik";
    context.fillStyle = color;
    context.textAlign = alignment === 0 ? "center" : alignment < 0 ? "left" : "right";
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

function drawImage(image, x, y, width, height, alpha = 1.0) {
    context.globalAlpha = alpha;
    context.drawImage(image, x, y, width, height);
    context.globalAlpha = 1.0;
}

function createImage(path) {
    let img = new Image();
    img.src = path;
    return img;
}