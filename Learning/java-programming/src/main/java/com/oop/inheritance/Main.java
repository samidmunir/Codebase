package com.oop.inheritance;

public class Main {
    public static void main(String[] args) {
        Aircraft aircraft = new Aircraft();
        aircraft.setManufacturer("Generic");
        aircraft.setModel("XYZ");
        aircraft.setNumberOfEngines(2);
        aircraft.takeoff();
        System.out.println(aircraft);

        Helicopter helicopter = new Helicopter();
        helicopter.setManufacturer("Bell Textron");
        helicopter.setModel("525");
        helicopter.setNumberOfEngines(2);
        helicopter.setNumberOfEngineBlades(4);
        helicopter.takeoff();
        System.out.println(helicopter);
    }
}