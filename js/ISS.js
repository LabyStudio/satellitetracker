class ISS {
    static ID = 25544;

    // ISS Ports
    static PORT_RASSVET = new Port(0, -13.8, -6.9, 0, 0, 0);
    static PORT_POISK = new Port(0, 13.03, -19.9, 0, 0, 180);
    static PORT_PIRS = new Port(0, -11.55, -19.9, 0, 0, 0);
    static PORT_AFT = new Port(0, 0.8, -39.4, 90, 0, 0);
    static PORT_FORWARD = new Port(0, -0.8, 22.8, 180, 0, 0);

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