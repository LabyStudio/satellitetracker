window.HUDScene = class {

    constructor(satelliteTracker) {
        this.satelliteTracker = satelliteTracker;

        this.context = null;
        this.hudTexture = null;
        this.planeGeometry = null;

        this.hoverSatellite = null;
        this.hoverToggleEarthFocusButton = false;
        this.hoverToggleDockingButton = false;
        this.hoverToggleTimeButton = false;
        this.hoverAddSatelliteButton = false;
        this.hoverAddSatelliteMenu = false;
        this.hoverTimeline = false;
        this.hoverLive = false;
        this.hoverSatelliteTLE = null;
        this.hoverSatelliteToRemove = null;

        this.flagAddSatelliteMenuOpen = false;
        this.stringSearchQuery = "";

        this.showDockingInformation = false;
        this.showTimeline = false;
        this.timeMouseClickedX = 0;
        this.timeMouseDragX = 0;
        this.timePrevSpeed = 0;
        this.timeDragging = false;

        // Timeline marker
        this.timeline = [];
        this.timeline.push({"speed": -150, "name": "%sx SPEED"});
        this.timeline.push({"speed": 1, "name": "ACTUAL SPEED"});
        this.timeline.push({"speed": 50, "name": "%sx SPEED"});
        this.timeline.push({"speed": 200, "name": "%sx SPEED"});
        this.timeline.push({"speed": 350, "name": "%sx SPEED"});
        this.timeline.push({"speed": 500, "name": "%sx SPEED"});

        this.textureSatellite = this.createImage("assets/img/hud/satellite.png");
        this.textureISS = this.createImage("assets/img/hud/iss.png");
        this.textureEarth = this.createImage("assets/img/hud/earth.png");
        this.textureMinus = this.createImage("assets/img/hud/minus.png");
        this.texturePlus = this.createImage("assets/img/hud/plus.png");
        this.textureDock = this.createImage("assets/img/hud/dock.png");
        this.textureTime = this.createImage("assets/img/hud/time.png");
    }

    createHUDScene(hudCanvas, cameraHUD) {
        this.initHUDSize(hudCanvas, cameraHUD)

        let width = hudCanvas.width;
        let height = hudCanvas.height;

        // Get context
        this.context = hudCanvas.getContext('2d');

        // Create also a custom scene for HUD.
        const sceneHUD = new THREE.Scene();

        // Create texture from rendered graphics.
        this.hudTexture = new THREE.Texture(hudCanvas)
        this.hudTexture.needsUpdate = true;

        // Create HUD material.
        const material = new THREE.MeshBasicMaterial({map: this.hudTexture});
        material.map.minFilter = THREE.LinearFilter;
        material.transparent = true;

        // Create plane to render the HUD. This plane fill the whole screen.
        this.planeGeometry = new THREE.PlaneGeometry(width, height);
        const plane = new THREE.Mesh(this.planeGeometry, material);
        sceneHUD.add(plane);

        return sceneHUD;
    }

    initHUDSize(hudCanvas, cameraHUD) {
        let width = this.satelliteTracker.renderer.canvasWidth;
        let height = this.satelliteTracker.renderer.canvasHeight;

        hudCanvas.width = width;
        hudCanvas.height = height;

        cameraHUD.left = -width / 2;
        cameraHUD.right = width / 2;
        cameraHUD.top = height / 2;
        cameraHUD.bottom = -height / 2;
        cameraHUD.updateProjectionMatrix();
    }

    updateHUD(date, mouseX, mouseY) {
        // Not initialized yet
        if (this.context == null || this.hudTexture == null)
            return;

        let width = this.satelliteTracker.renderer.canvasWidth;
        let height = this.satelliteTracker.renderer.canvasHeight;

        // Clear & update screen
        this.context.clearRect(0, 0, width, height);
        this.hudTexture.needsUpdate = true;

        if (this.satelliteTracker.loadingProgress.isReady()) {
            let focusedSatellite = this.satelliteTracker.getFocusedSatellite();
            if (focusedSatellite !== undefined) {
                let dockingAvailable = focusedSatellite.docking.length > 0;

                // Docking list
                if (this.showDockingInformation && dockingAvailable) {
                    this.drawDockingList(focusedSatellite.docking, width - 10, 18);
                }

                let buttonY = height - 50;

                // Draw earth focus button on right side
                this.drawEarthFocusButton(width - 50, buttonY, 40, mouseX, mouseY);
                buttonY -= 50;

                // Draw time changer button
                if (!this.satelliteTracker.renderer.isMobile) {
                    this.drawTimeButton(width - 50, buttonY, 40, mouseX, mouseY);
                    buttonY -= 50;
                }

                // Draw docking toggle button
                if (dockingAvailable) {
                    this.drawDockingButton(width - 50, buttonY, 40, mouseX, mouseY);
                    buttonY -= 50;
                }

                if (!this.satelliteTracker.renderer.isMobile) {
                    // Draw telemetry in the bottom left
                    this.drawTelemetry(focusedSatellite, 0, height - 150, 500, 150, date);

                    // Draw hint for user experience
                    if (!this.satelliteTracker.focusedEarth && !this.hoverToggleEarthFocusButton) {
                        this.drawHint(width - 40, height - 40, "You can switch to earth view here", '#666666', '#ffffff', 0.4);
                    }
                }
            }

            // Draw timeline to change the time
            if (this.showTimeline) {
                let shift = width < 1200 ? 1200 - width : 0;
                this.drawTimeline(width / 2 - width / 4, height - 150 + shift / 2, width / 2, 100, mouseX, mouseY, date);
            }

            // Draw satellite list
            this.drawSatelliteList(3, height - (this.satelliteTracker.renderer.isMobile ? 10 : 160), mouseX, mouseY);

            // Add satellite menu
            if (this.flagAddSatelliteMenuOpen) {
                this.drawAddSatelliteMenu(width / 2, height / 6, this.satelliteTracker.renderer.isMobile ? width - 20 : Math.max(400, width / 3), 50, mouseX, mouseY);
            }
        } else {
            // Cover unfinished scene
            this.drawRect(0, 0, width, height, '#000000');

            // Render progress bars
            let progressLoader = this.satelliteTracker.loadingProgress;

            // Calculate y position
            let listY = -(60 * progressLoader.getModuleAmount()) / 2 + 28;

            // Render all progress states
            for (let module in progressLoader.progress) {
                let [progress, state] = progressLoader.getProgressState(module);

                // Hide progress element if it's fully loaded
                if (progress < 100) {
                    // Draw progress state, percentage and bar
                    this.drawCenteredText(width / 2, height / 2 + listY, state + " " + parseInt(progress) + "%", '#ffffff', 25, false);
                    this.drawProgressbar(width / 2 - 100, height / 2 + 15 + listY, 200, 3, progress);

                    listY += 60;
                }
            }
        }
    }

    onMouseMove(clientX, clientY) {
        if (this.timeDragging) {
            let offset = clientX - this.timeMouseClickedX;

            this.timeMouseDragX = offset;
            this.satelliteTracker.currentTime = this.satelliteTracker.getTime().getTime();
            this.satelliteTracker.prevTime = this.satelliteTracker.getBrowserTime();
            this.satelliteTracker.timeSpeed = 1 - offset / 2;
        }
    }

    onMouseRelease(clientX, clientY) {
        if (this.timeDragging) {
            this.timeDragging = false;
            this.satelliteTracker.renderer.controls.enabled = true;

            let speed = this.satelliteTracker.timeSpeed;
            let nearestDistance = -1;
            let nearestMarkerSpeed = 0;

            // Draw marker
            for (let index in this.timeline) {
                let marker = this.timeline[index];

                let distance = Math.abs(marker.speed - speed);
                if (distance < nearestDistance || nearestDistance === -1) {
                    nearestDistance = distance;
                    nearestMarkerSpeed = marker.speed;
                }
            }

            this.timePrevSpeed = this.satelliteTracker.timeSpeed;
            this.timeMouseDragX = (-nearestMarkerSpeed + 1) * 2;
            this.satelliteTracker.currentTime = this.satelliteTracker.getTime().getTime();
            this.satelliteTracker.prevTime = this.satelliteTracker.getBrowserTime();
            this.satelliteTracker.timeSpeed = nearestMarkerSpeed;
        }
    }

    onMouseClick(mouseX, mouseY) {
        if (this.hoverSatellite != null) {
            this.satelliteTracker.setFocusedSatellite(this.hoverSatellite);
        }
        if (this.hoverToggleEarthFocusButton) {
            this.satelliteTracker.toggleEarthFocus();
        }

        if (this.hoverToggleDockingButton) {
            this.showDockingInformation = !this.showDockingInformation;
        }

        if (this.hoverToggleTimeButton) {
            this.showTimeline = !this.showTimeline;
        }

        // Time line dragging
        if (this.showTimeline && !this.timeDragging && this.hoverTimeline) {
            this.timeMouseClickedX = mouseX - this.timeMouseDragX;
            this.timeDragging = true;
            this.satelliteTracker.renderer.controls.enabled = false;
        }

        // Reset timeline
        if (this.showTimeline && !this.timeDragging && this.hoverLive) {
            this.timeMouseDragX = 0;

            this.satelliteTracker.timeSpeed = 1;
            this.satelliteTracker.prevTime = this.satelliteTracker.getBrowserTime();
            this.satelliteTracker.currentTime = this.satelliteTracker.getBrowserTime();
        }

        // Click on search bar
        if (this.hoverAddSatelliteMenu) {
            if (this.satelliteTracker.renderer.isMobile) {
                let promptString = prompt("Satellite name");
                if (promptString !== null) {
                    this.stringSearchQuery = promptString;
                }
            }
        } else {
            // Click out of search bar

            // Close menu
            this.flagAddSatelliteMenuOpen = false;

            // Create new satellite
            if (this.hoverSatelliteTLE != null) {
                this.satelliteTracker.registry.spawnSatellite(new Satellite(this.satelliteTracker, this.hoverSatelliteTLE));

                this.hoverSatelliteTLE = null;
            }
        }

        // Click on add satellite button
        if (this.hoverAddSatelliteButton) {
            // Open satellite menu
            this.flagAddSatelliteMenuOpen = true;

            // Load database if empty
            if (Object.keys(this.satelliteTracker.registry.database).length === 0) {
                this.satelliteTracker.registry.loadAll(function () {
                });
            }
        }

        // Remove satellite
        if (this.hoverSatelliteToRemove != null) {
            this.satelliteTracker.registry.destroySatellite(this.hoverSatelliteToRemove);
            this.hoverSatelliteToRemove = null;
        }
    }

    onKeyDownScreen(key, code, ctrlKey) {
        if (this.flagAddSatelliteMenuOpen) {
            if (key.length === 1 && !ctrlKey) {
                this.stringSearchQuery += key;
            } else if (code === 8) {
                this.stringSearchQuery = this.stringSearchQuery.substr(0, this.stringSearchQuery.length - 1);
            } else if (code === 17) {
                this.stringSearchQuery = "";
            }
        }
    }

// ############ Right bottom buttons ############

    drawEarthFocusButton(x, y, size, mouseX, mouseY) {
        let mouseOver = this.hoverToggleEarthFocusButton = mouseX > x && mouseX < x + size && mouseY > y && mouseY < y + size;
        let offset = mouseOver ? 1 : 0;

        this.drawImage(this.satelliteTracker.focusedEarth ? this.textureSatellite : this.textureEarth, x - offset, y - offset, size + offset * 2, size + offset * 2, mouseOver ? 0.8 : 0.5);
        if (mouseOver) {
            this.drawRightText(x - 5, y + size / 2 + 4, "Focus " + (this.satelliteTracker.focusedEarth ? "Satellite" : "Earth"), '#ffffff', 20, false);
        }
    }

    drawDockingButton(x, y, size, mouseX, mouseY) {
        let mouseOver = this.hoverToggleDockingButton = mouseX > x && mouseX < x + size && mouseY > y && mouseY < y + size;
        let offset = mouseOver ? 1 : 0;

        this.drawImage(this.textureDock, x - offset, y - offset, size + offset * 2, size + offset * 2, mouseOver ? 0.8 : 0.5);
        if (mouseOver) {
            this.drawRightText(x - 5, y + size / 2 + 4, (this.showDockingInformation ? "Hide" : "Show") + " docking information", '#ffffff', 20, false);
        }
    }

    drawTimeButton(x, y, size, mouseX, mouseY) {
        let mouseOver = this.hoverToggleTimeButton = mouseX > x && mouseX < x + size && mouseY > y && mouseY < y + size;
        let offset = mouseOver ? 1 : 0;

        this.drawImage(this.textureTime, x - offset, y - offset, size + offset * 2, size + offset * 2, mouseOver ? 0.8 : 0.5);
        if (mouseOver) {
            this.drawRightText(x - 5, y + size / 2 + 4, (this.showTimeline ? "Hide" : "Show") + " speed settings", '#ffffff', 20, false);
        }
    }

// ############ Satellite list ############

    drawSatelliteList(x, y, mouseX, mouseY) {
        this.hoverSatellite = null;
        this.hoverSatelliteToRemove = null;

        Object.values(this.satelliteTracker.registry.satellites).forEach(satellite => {
            y -= 32;
            this.drawSatelliteEntry(satellite, x, y, 30, mouseX, mouseY);
        });

        y -= 32;
        this.drawSatellitePlusButton(satellite, x, y, 30, mouseX, mouseY);
    }

    drawSatelliteEntry(satellite, x, y, height, mouseX, mouseY) {
        let gap = 3;
        let fontSize = 16;

        // Define font size
        this.drawText(0, 0, "", '#ffffff', fontSize, false);
        let fontWidth = this.context.measureText(satellite.name).width;
        let width = x + height + 3 * 2 + fontWidth;

        let focused = satellite === this.satelliteTracker.getFocusedSatellite();
        let mouseOver = mouseX > x && mouseX < x + width && mouseY > y && mouseY < y + height;
        let gradient = this.getGradientTopBottom(x, y, y + height, "rgba(0,0,0, " + (mouseOver ? 0.8 : 0.3) + ")", "rgba(0,0,0, " + (mouseOver ? 0.6 : 0.2) + ")");
        let iss = parseInt(satellite.id) === ISS.ID;

        if (mouseOver) {
            gap = 1;
            this.hoverSatellite = satellite;
        }

        // Draw entry
        this.drawRect(x, y, x + width, y + height, gradient);
        this.drawImage(iss ? this.textureISS : this.textureSatellite, x + gap, y + gap, height - gap * 2, height - gap * 2, focused ? 1.0 : 0.4);
        this.drawText(x + height + 3, y + height / 2 + fontSize / 2, satellite.name, "rgba(255,255,255, " + (focused ? 1.0 : 0.4) + ")", fontSize, false);

        if (parseInt(satellite.id) !== ISS.ID) {
            // Draw delete button
            let hoverMinus = mouseX > x + width + 2 && mouseX < x + width + height + 2 && mouseY > y && mouseY < y + height;
            let minusOffset = hoverMinus ? 8 : 10;
            this.drawRect(x + width + 2, y, x + width + height + 2, y + height, "rgba(0,0,0, " + (hoverMinus ? 0.6 : 0.2) + ")");
            this.drawImage(this.textureMinus, x + width + minusOffset + 2, y + minusOffset, height - minusOffset * 2, height - minusOffset * 2, hoverMinus ? 1.0 : 0.4);

            if (hoverMinus) {
                this.hoverSatelliteToRemove = satellite;
            }
        }
    }

    drawSatellitePlusButton(satellite, x, y, height, mouseX, mouseY) {
        let width = x + height - 2;
        let mouseOver = mouseX > x && mouseX < x + width && mouseY > y && mouseY < y + height;
        let gradient = this.getGradientTopBottom(x, y, y + height, "rgba(0,0,0, " + (mouseOver ? 0.8 : 0.3) + ")", "rgba(0,0,0, " + (mouseOver ? 0.6 : 0.2) + ")");
        let gap = mouseOver ? 5 : 6;

        this.hoverAddSatelliteButton = mouseOver;

        this.drawRect(x, y, x + width, y + height, gradient);
        this.drawImage(this.texturePlus, x + gap, y + gap, height - gap * 2, height - gap * 2, mouseOver ? 0.6 : 0.4);
    }

// ############ Docking list ############

    drawDockingList(docking, x, y) {
        let fontSize = 15;
        let list = [];

        // Max satellite name
        let maxValueLength = 0;
        let maxKeyLength = 0;
        for (const index in docking) {
            let satellite = docking[index];
            if (satellite.port != null) {
                maxValueLength = Math.max(maxValueLength, this.getStringWidth(satellite.name, fontSize, false));
                maxKeyLength = Math.max(maxKeyLength, this.getStringWidth(satellite.port.name, fontSize, false));
                list.push(satellite);
            }
        }

        // Title
        this.drawText(x - maxValueLength - 10 - maxKeyLength, y, "Docked spacecrafts:", '#ffffff', false);
        y += fontSize + 5;

        // Sort
        list.sort((a, b) => {
            return this.getStringWidth(b.port.name, fontSize, false) - this.getStringWidth(a.port.name, fontSize, false);
        });

        // Satellite list
        for (const index in list) {
            let satellite = list[index];

            this.drawRightText(x - maxValueLength - 5, y, satellite.port.name + ":", '#aa0000', fontSize, false);
            this.drawText(x - maxValueLength, y, satellite.name, '#999999', fontSize, false);

            y += fontSize;
        }
    }

// ############ Add Satellite Menu ############

    drawAddSatelliteMenu(x, y, width, height, mouseX, mouseY) {
        // Hover menu
        this.hoverAddSatelliteMenu = mouseX > x - width / 2 && mouseX < x + width / 2 && mouseY > y && mouseY < y + height;
        this.hoverSatelliteTLE = null;

        let padding = 5;

        // Background of menu
        this.drawRect(x - width / 2, y, x + width / 2, y + height, "rgba(0,0,0, 0.8)");

        // Search bar
        this.drawRect(x - width / 2 + padding, y + padding, x + width / 2 - padding, y + height - padding, "rgba(255,255,255, 0.6)");
        this.drawText(x - width / 2 + padding + 3, y + padding + 30, this.stringSearchQuery, '#000000', height - 10, false);

        // Blinking cursor
        if ((this.satelliteTracker.getBrowserTime() / 500).toFixed(0) % 2 === 0) {
            let fontWidth = this.context.measureText(this.stringSearchQuery).width;
            this.drawText(x - width / 2 + padding + 3 + fontWidth, y + padding + 30 - 4, "_", '#000000', height - 10, false);
        }

        let listY = y + height + 20;
        let query = this.stringSearchQuery.toLowerCase();
        let entryHeight = 30;

        let gradient = this.getGradientTopBottom(x, y, y + height, "rgba(0,0,0, 0.95)", "rgba(0,0,0, 0.85)");

        if (Object.keys(this.satelliteTracker.registry.database).length === 0) {
            // Loading
            this.drawRect(x - width / 2, listY, x + width / 2, listY + entryHeight, gradient);
            this.drawText(x - width / 2, listY + 24, "Loading satellite database...", '#FFFFFF', entryHeight, false);
        } else {
            // Draw results
            let matches = 0;
            for (let id in this.satelliteTracker.registry.database) {
                let tle = this.satelliteTracker.registry.database[id];
                let name = tle[0];

                // Already added to the user catalog?
                let alreadyAdded = false;
                Object.values(this.satelliteTracker.registry.satellites).forEach(satellite => {
                    if (satellite.id === id) {
                        alreadyAdded = true;
                    }
                });

                // Match to the query
                if ((name.toString().toLowerCase().includes(query) || id.toString().includes(query)) && !alreadyAdded) {
                    if (matches <= 8) {
                        let hoverEntry = mouseX > x - width / 2 && mouseX < x + width / 2 && mouseY > listY && mouseY < listY + entryHeight;

                        // Draw satellite entry
                        this.drawRect(x - width / 2, listY, x + width / 2, listY + entryHeight, gradient);
                        this.drawImage(this.textureSatellite, x - width / 2 + 1, listY + 1, entryHeight - 2, entryHeight - 2, hoverEntry ? 1.0 : 0.8);
                        this.drawText(x - width / 2 + entryHeight + 4, listY + entryHeight - 9, name, "rgba(255,255,255, " + (hoverEntry ? 0.8 : 0.5) + ")", entryHeight / 2, false);
                        this.drawRightText(x + width / 2 - entryHeight - 4, listY + entryHeight - 9, id, "rgba(255,255,255, " + (hoverEntry ? 0.8 : 0.5) + ")", entryHeight / 2, false);

                        // Add button
                        let hoverAddButton = mouseX > x + width / 2 - entryHeight && mouseX < x + width / 2 && mouseY > listY && mouseY < listY + entryHeight;
                        let iconOffset = hoverAddButton ? 3 : 5;
                        this.drawImage(this.texturePlus, x + width / 2 - entryHeight + iconOffset, listY + iconOffset, entryHeight - iconOffset * 2, entryHeight - iconOffset * 2, hoverAddButton ? 0.8 : 0.4);

                        if (hoverEntry) {
                            this.hoverSatelliteTLE = tle;
                        }

                        listY += entryHeight + 4;
                    }

                    matches++;
                }
            }

            if (matches > 8) {
                this.drawText(x - width / 2, listY + 14, "and " + (matches - 8) + " more...", '#FFFFFF', 12, false);
            }
        }
    }


// ############ Progressbar ############

    drawProgressbar(x, y, width, height, percentage) {
        let progress = width / 100 * percentage;

        this.drawRect(x + progress, y, x + width, y + height, '#444444')
        this.drawRect(x, y, x + progress, y + height, '#aa0000')
    }


// ############ Timeline ############

    drawTimeline(x, y, width, height, mouseX, mouseY, date) {
        let thickness = 70;
        let radius = width / 1.5;

        let centerX = x + width / 2;
        let centerY = y + radius;

        // Draw timeline ring background
        this.drawArc(centerX, centerY + thickness / 2, radius, 0, 180, thickness, "rgba(0,0,0, 0.5)");

        // Draw circle fill
        this.drawArc(centerX, centerY + thickness / 2, radius - thickness * 1.5, 0, 180, thickness * 2, "rgba(0,0,0, 0.7)");

        // Draw timeline line
        this.drawArc(centerX, centerY + thickness / 2, radius, 0, 90, 2, '#ffffff');
        this.drawArc(centerX, centerY + thickness / 2, radius, 90, 180, 1, "rgba(1,1,1, 0.7)");

        let prevSpeed = this.timePrevSpeed;
        let speed = this.satelliteTracker.timeSpeed;

        let snapAnimationPercentage = Math.min(1, 1.0 / 100 * (this.satelliteTracker.getBrowserTime() - this.satelliteTracker.prevTime));
        let snapAnimationSpeedOffset = this.timeDragging ? 0 : (prevSpeed - speed) * (1 - snapAnimationPercentage);

        // Draw marker
        for (let index in this.timeline) {
            let marker = this.timeline[index];

            let rotationOffset = (marker.speed - speed - snapAnimationSpeedOffset) / 10;

            let markerRelX = 0;
            let markerRelY = -radius + thickness / 2;
            let bottomLabel = index % 2 === 0;
            let enabled = rotationOffset <= 0;

            this.context.save();
            this.context.translate(centerX, centerY);
            this.context.rotate(rotationOffset / 180 * Math.PI);

            // Draw round marker
            this.drawRoundRect(markerRelX - 6, markerRelY - 6, 6 * 2, 6 * 2, 6, 0, '#000000', '#000000');
            this.drawArc(markerRelX, markerRelY, 7, 0, 360, 2, '#ffffff')

            if (enabled) {
                this.drawRoundRect(markerRelX - 2, markerRelY - 2, 2 * 2, 2 * 2, 2, 0, '#ffffff', '#ffffff');
            }

            // Draw connector
            this.drawRect(markerRelX - 1, markerRelY + (bottomLabel ? 7 : -12), markerRelX + 1, markerRelY + (bottomLabel ? 12 : -7), '#ffffff')

            // Draw label
            let text = marker.name.includes("%s") ? marker.name.replace("%s", marker.speed) : marker.name;
            this.drawCenteredText(markerRelX, markerRelY + (bottomLabel ? 26 : -18), text, enabled ? '#ffffff' : '#aaaaaa', 12, true);

            this.context.restore();
        }

        // Draw timer
        let offset = (this.satelliteTracker.getTime() - this.satelliteTracker.getBrowserTime()) / 1000;
        let prefix = offset < 0 ? "-" : "+";
        let value = Math.abs(offset);
        let hours = Math.floor(value / 3600);
        let minutes = Math.floor((value - (hours * 3600)) / 60);
        let seconds = (value - (hours * 3600) - (minutes * 60)) | 0;

        let isLive = hours === 0 && minutes === 0 && seconds === 0;
        let currentSpeed = this.satelliteTracker.timeSpeed;

        if (hours < 10) hours = "0" + hours;
        if (minutes < 10) minutes = "0" + minutes;
        if (seconds < 10) seconds = "0" + seconds;

        let timerString = "T" + prefix + hours + ":" + minutes + ":" + seconds;
        let stateString = currentSpeed === 1 ? "ACTUAL SPEED" : (currentSpeed + "x SPEED");

        // Current speed display
        this.drawCenteredText(x + width / 2, y + height + 5, timerString, '#ffffff', 30, false);
        this.drawCenteredText(x + width / 2, y + height + 5 + 25, stateString, '#aaaaaa', 18, false);

        this.hoverLive = mouseX > x + width / 2 + 100 && mouseX < x + width / 2 + 160 && mouseY > y + height && mouseY < y + height + 25
        this.hoverTimeline = mouseX > x && mouseX < x + width && mouseY > y && mouseY < y + height;

        // Live state
        let color = isLive ? '#ff0000' : this.hoverLive ? '#ffffff' : '#888888';
        this.drawRoundRect(x + width / 2 + 100, y + height + 5, 6 * 2, 6 * 2, 6, 0, color, color);
        this.drawText(x + width / 2 + 115, y + height + 17, "LIVE", color, 20, isLive);
    }

// ############ Telemetry ############

    drawTelemetry(satellite, x, y, width, height, date) {
        let state = satellite.getPositionAtTime(date);

        if (state.hasCrashed()) {
            this.drawText(x + 5, y + height - 8, satellite.name + " burnt up in the atmosphere and is no longer in orbit", '#999999', 14, false);
        } else {
            let gradient = this.getGradientTopBottom(x, y, y + height, "rgba(0,0,0, 0.5)", "rgba(0,0,0, 0.2)");
            let curveStartX = x + width * 0.6;

            this.drawRect(x, y, curveStartX, y + height, gradient);
            this.drawSpeedometerBackgroundCurve(curveStartX, y, width - curveStartX, height, gradient);

            this.drawSpeedometer(x + 100, y + 90, state.getSpeed(), 30000, "SPEED", "KM/H");
            this.drawSpeedometer(x + 280, y + 90, state.altitude, 460, "ALTITUDE", "KM");

            this.drawCenteredText(x + 100 + (280 - 100) / 2, y + height - 8, satellite.name + " TELEMETRY", '#999999', 14, false);
        }
    }

    drawSpeedometer(x, y, value, maxValue, title, unit) {
        let arcOffset = 18;
        let arcStart = -arcOffset;
        let arcEnd = 180 + arcOffset;
        let arcThickness = 6;
        let arcRedRange = 35;
        let radius = 75;
        let initializationDuration = 2000;

        // Initialize animation
        let timePassed = this.satelliteTracker.getBrowserTime() - this.satelliteTracker.initializeTime;
        let initializeProgress = sigmoid(Math.max(0, Math.min(1, timePassed / initializationDuration)) * 10);

        // Progress position
        let arcTotalRange = Math.abs(arcEnd) + Math.abs(arcStart);
        let arcRange = Math.min(arcTotalRange, (arcTotalRange - arcRedRange) / maxValue * value * initializeProgress);
        let arcWhiteProgress = Math.min(arcTotalRange - arcRedRange, arcRange);
        let arcRedProgress = Math.max(arcTotalRange - arcRedRange, arcRange) - (arcTotalRange - arcRedRange);

        // Track line
        this.drawArc(x, y, radius, arcStart + arcWhiteProgress, arcEnd - arcRedRange, arcThickness, '#888888');
        this.drawArc(x, y, radius, arcEnd - arcRedRange + arcRedProgress, arcEnd, arcThickness, '#aa0000');

        // Progress
        this.drawArc(x, y, radius, arcStart, arcStart + arcWhiteProgress, arcThickness, '#ffffff');
        this.drawArc(x, y, radius, arcEnd - arcRedRange, arcEnd - arcRedRange + arcRedProgress, arcThickness, '#ffaaaa');

        // Draw start hook
        this.drawArc(x, y, radius - 3, arcStart - 1, arcStart + 1, 12, '#ffffff');

        // Animate value
        value = Math.round(value * initializeProgress);

        let labelValue = value;

        // Thousand
        if (value <= -10000 || value >= 100000) {
            labelValue = ((value / 1000) | 0) + "k";
        }

        // Million
        if (value <= -1000000 || value >= 1000000) {
            labelValue = ((value / 1000000) | 0) + "M";
        }

        // Labels
        this.drawCenteredText(x, y - 35, title, '#999999', 12, true);
        this.drawCenteredText(x, y + 8, labelValue, '#ffffff', 45, false);
        this.drawCenteredText(x, y + 30, unit, '#999999', 12, true);
    }

    drawArc(x, y, radius, degreeStart, degreeEnd, thickness, color) {
        this.context.beginPath();
        this.context.arc(x, y, radius, (Math.PI / 180) * (degreeStart + 180), (Math.PI / 180) * (degreeEnd + 180));
        this.context.strokeStyle = color;
        this.context.lineJoin = 'round';
        this.context.lineWidth = thickness;
        this.context.stroke();
    }

    drawSpeedometerBackgroundCurve(x, y, width, height, color) {
        this.context.fillStyle = color;
        this.context.beginPath();
        this.context.moveTo(x, y);

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

        this.context.bezierCurveTo(
            x1 + ax1, y1 + ay1,
            x2 - ax1, y2 - ay2,
            x2, y2
        );

        this.context.lineTo(x, y + height);
        this.context.closePath();
        this.context.fill();
    }

// ############ Draw utils ############


    drawCenteredText(x, y, string, color, size, bold) {
        this.drawAlignmentText(x, y, string, color, size, 0, bold);
    }

    drawText(x, y, string, color, size, bold) {
        this.drawAlignmentText(x, y, string, color, size, -1, bold);
    }

    drawRightText(x, y, string, color, size, bold) {
        this.drawAlignmentText(x, y, string, color, size, 1, bold);
    }

    drawHint(x, y, string, backgroundColor = '#444444', fontColor = '#ffffff', alpha = 0.4) {
        let arrowWidth = 10;
        let arrowHeight = 10;

        let initializationDuration = 2000;
        let visibleDuration = 8000;

        // Fade in
        let timePassed = this.satelliteTracker.getBrowserTime() - this.satelliteTracker.initializeTime;
        let initializeProgress = sigmoid(Math.max(0, Math.min(1, timePassed / initializationDuration)) * 10);

        // Fade out
        if (timePassed > visibleDuration + initializationDuration) {
            initializeProgress = 0.0;
        } else if (timePassed > visibleDuration) {
            initializeProgress -= Math.min(1.0, 1.0 / initializationDuration * (timePassed - visibleDuration));
        }

        let fontSize = 15;
        let padding = 7;

        let stringWidth = this.getStringWidth(string, fontSize, false);
        let width = stringWidth + padding * 2;
        let height = fontSize + padding * 2 - 5;

        // Shift hint
        x -= arrowWidth;
        y -= arrowHeight * initializeProgress;

        // Draw arrow
        this.context.globalAlpha = alpha * initializeProgress;
        this.context.fillStyle = backgroundColor;
        this.context.beginPath();
        this.context.moveTo(x, y - height);
        this.context.lineTo(x + arrowWidth, y + arrowHeight);
        this.context.lineTo(x - height, y);
        this.context.lineTo(x, y);
        this.context.closePath();
        this.context.fill();

        // Draw background rect
        this.drawRect(x - width, y - height, x, y, backgroundColor, alpha * initializeProgress);

        // Draw text
        this.context.globalAlpha = 1.0 * initializeProgress;
        this.drawText(x - width + padding, y - padding, string, fontColor, fontSize, false);

        // Reset
        this.context.globalAlpha = 1.0;
    }

    drawRoundRect(x, y, width, height, radius = 5, thickness = 2, color, strokeColor, fill = true, stroke = true) {
        this.context.beginPath();
        this.context.lineWidth = thickness;
        this.context.moveTo(x + radius, y);
        this.context.lineTo(x + width - radius, y);
        this.context.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.context.lineTo(x + width, y + height - radius);
        this.context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.context.lineTo(x + radius, y + height);
        this.context.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.context.lineTo(x, y + radius);
        this.context.quadraticCurveTo(x, y, x + radius, y);
        this.context.closePath();

        if (fill) {
            this.context.fillStyle = color;
            this.context.fill();
        }

        if (stroke) {
            this.context.strokeStyle = strokeColor;
            this.context.stroke();
        }
    }

    drawAlignmentText(x, y, string, color, size, alignment, bold) {
        this.context.font = (bold ? "bold" : "normal") + " " + size + "px FoundryGridnik";
        this.context.fillStyle = color;
        this.context.textAlign = alignment === 0 ? "center" : alignment < 0 ? "left" : "right";
        this.context.fillText(string, x, y);
    }

    getStringWidth(string, size, bold) {
        this.context.font = (bold ? "bold" : "normal") + " " + size + "px FoundryGridnik";
        return this.context.measureText(string).width;
    }

    drawRect(left, top, right, bottom, color, alpha = 1) {
        this.context.fillStyle = color;
        this.context.globalAlpha = alpha;
        this.context.fillRect(left, top, right - left, bottom - top);
        this.context.globalAlpha = alpha;
    }

    getGradientTopBottom(x, y1, y2, topColor, bottomColor) {
        const gradient = this.context.createLinearGradient(x, y1, x, y2);
        gradient.addColorStop(0, topColor);
        gradient.addColorStop(1, bottomColor);
        return gradient;
    }

    drawImage(image, x, y, width, height, alpha = 1.0) {
        this.context.globalAlpha = alpha;
        this.context.filter = 'invert(1) blur(5px)';
        this.context.drawImage(image, x + 3, y + 3, width, height);
        this.context.filter = 'invert(0) blur(0px)';
        this.context.drawImage(image, x, y, width, height);
        this.context.globalAlpha = 1.0;
    }

    createImage(path) {
        let img = new Image();
        img.src = path;
        return img;
    }
}