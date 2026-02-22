package com.oop.inheritance;

public class Helicopter extends Aircraft {
    public int numberOfEngineBlades;
    
    public Helicopter() {}

    public Helicopter(int numberOfEngineBlades) {
        this.numberOfEngineBlades = numberOfEngineBlades;
    }

    public Helicopter(String manufacturer, String model, int numberOfEngines, int numberOfEngineBlades) {
        super(manufacturer, model, numberOfEngines);
        this.numberOfEngineBlades = numberOfEngineBlades;
    }

    public void setNumberOfEngineBlades(int numberOfEngineBlades) {
        this.numberOfEngineBlades = numberOfEngineBlades;
    }

    public int getNumberOfEngineBlades() {
        return numberOfEngineBlades;
    }

    @Override
    public void takeoff() {
        System.out.println("\nHelicopter.takeoff() called...");
        System.out.println("\tHelicopter is taking off from the helipad.");
    }

    @Override
    public String toString() {
        System.out.println("\nHelicopter.toString() called...");
        String helicopter = super.toString() + "\n- # engine blades: " + numberOfEngineBlades;

        return helicopter;
    }
}