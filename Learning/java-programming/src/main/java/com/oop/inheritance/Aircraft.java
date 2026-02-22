package com.oop.inheritance;

public class Aircraft {
    public String manufacturer;
    public String model;
    public int numberOfEngines;

    public Aircraft() {}

    public Aircraft(String manufacturer, String model, int numberOfEngines) {
        this.manufacturer = manufacturer;
        this.model = model;
        this.numberOfEngines = numberOfEngines;
    }

    public void setManufacturer(String manufacturer) {
        this.manufacturer = manufacturer;
    }

    public String getManufacturer() {
        return manufacturer;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getModel() {
        return model;
    }

    public void setNumberOfEngines(int numberOfEngines) {
        this.numberOfEngines = numberOfEngines;
    }

    public void takeoff() {
        System.out.println("\nAircraft.takeoff() called...");
        System.out.println("\tThe aircraft is taking off from the runway.");
    }

    @Override
    public String toString() {
        String aircraft = manufacturer + " " + model + "\n- # engines: " + numberOfEngines;

        return aircraft;
    }
}