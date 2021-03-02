window.LoadingProgress = class {

    constructor(satelliteTracker, modules, readyCallback) {
        this.satelliteTracker = satelliteTracker;
        this.progress = [];
        this.states = [];
        this.timestamps = [];
        this.readyCallback = readyCallback;

        // Init
        for (let module in modules) {
            this.progress[module] = 0;
            this.states[module] = modules[module];
            this.timestamps[module] = this.satelliteTracker.getBrowserTime();
        }
    }

    updateProgress(module, progress) {
        // Update timestamp on progress change, currently unused
        if (this.progress[module] !== progress) {
            this.timestamps[module] = this.satelliteTracker.getBrowserTime();
        }

        // Update progress
        this.progress[module] = progress;

        // On ready
        if (this.isReady()) {
            this.readyCallback();
        }
    }

    updateState(module, state) {
        this.states[module] = state;
    }

    getProgress() {
        let progress = 0;
        for (let module in this.progress) {
            progress += this.progress[module];
        }
        return 100 / (this.getModuleAmount() * 100) * progress;
    }

    getProgressState(module) {
        return [this.progress[module], this.states[module]];
    }

    getModuleAmount() {
        let amount = 0;
        for (let count in this.progress) {
            amount++;
        }
        return amount;
    }

    isReady() {
        return this.getProgress() >= 100;
    }
}