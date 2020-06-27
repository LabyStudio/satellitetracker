class ISS {
    static get ID() {
        return 25544;
    }

    // ISS Ports
    static get PORT_RASSVET() {
        return new Port(0, -13.8, -6.9, 0, 0, 0);
    }

    static get PORT_POISK() {
        return new Port(0, 13.03, -19.9, 0, 0, 180);
    }

    static get PORT_PIRS() {
        return new Port(0, -11.55, -19.9, 0, 0, 0);
    }

    static get PORT_AFT() {
        return new Port(0, 0.8, -39.4, 90, 0, 0);
    }

    static get PORT_FORWARD() {
        return new Port(0, -0.8, 24.0, 180, 0, 180);
    }

    static createSpacecraft(tle) {
        return new Satellite(tle, function (loaded, progress) {
            initializePercentage = progress;
            if (loaded) {
                initializationCompleted();
            }
        }).dock(45476, ISS.PORT_POISK)
            .dock(45476, ISS.PORT_RASSVET)
            .dock(45623, ISS.PORT_FORWARD);
    }
}