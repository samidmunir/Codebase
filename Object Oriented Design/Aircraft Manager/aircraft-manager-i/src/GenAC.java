public class GenAC extends Aircraft {
    private String engine_model;
    private String engine_type;
    private int horsepower;
    private int number_of_doors;
    private boolean has_retractable_landing_gear;
    private int number_of_wheels;
    private boolean has_glass_cockpit;

    public GenAC() {}

    public GenAC(String manufacturer, String model, String registration, String airline, short number_of_engines, 
        short range, long max_cruise_level, String engine_model, String engine_type, int horsepower, int number_of_doors,
        boolean has_retractable_landing_gear, int number_of_wheels, boolean has_glass_cockpit) {
            super(manufacturer, engine_model, registration, airline, number_of_engines, range, max_cruise_level);
            this.engine_model = engine_model;
            this.engine_type = engine_type;
            this.horsepower = horsepower;
            this.number_of_doors = number_of_doors;
            this.has_retractable_landing_gear = has_retractable_landing_gear;
            this.number_of_wheels = number_of_wheels;
            this.has_glass_cockpit = has_glass_cockpit;
        }

    public void set_engine_model(String engine_model) {
        this.engine_model = engine_model;
    }

    public String get_engine_model() {
        return engine_model;
    }

    public void set_engine_type(String engine_type) {
        this.engine_type = engine_type;
    }

    public String get_engine_type() {
        return engine_type;
    }

    public void set_horsepower(int horsepower) {
        this.horsepower = horsepower;
    }

    public int get_horsepower() {
        return horsepower;
    }

    public void set_number_of_doors(int number_of_doors) {
        this.number_of_doors = number_of_doors;
    }

    public int get_number_of_doors() {
        return number_of_doors;
    }

    public void set_retractable_landing_gear(boolean has_retractable_landing_gear) {
        this.has_retractable_landing_gear = has_retractable_landing_gear;
    }

    public boolean get_retractable_landing_gear() {
        return has_retractable_landing_gear;
    }

    public void set_number_of_wheels(int number_of_wheels) {
        this.number_of_wheels = number_of_wheels;
    }

    public int get_number_of_wheels() {
        return number_of_wheels;
    }

    public void set_glass_cockpit(boolean has_glass_cockpit) {
        this.has_glass_cockpit = has_glass_cockpit;
    }

    public boolean get_glass_cockpit() {
        return has_glass_cockpit;
    }
}