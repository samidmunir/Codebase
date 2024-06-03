public class Airliner extends Aircraft {
    private String engine_model;
    private String engine_type;
    private int thrust_rating;
    private boolean has_glass_cockpit;
    private boolean is_ETOPS_certified;

    public Airliner() {}

    public Airliner(String manufacturer, String model, String registration, String airline, short number_of_engines, 
        short range, long max_cruise_level, String engine_model, String engine_type, int thrust_rating, 
        boolean has_glass_cockpit, boolean is_ETOPS_certified) {
            super(manufacturer, model, registration, airline, number_of_engines, range, max_cruise_level);
            this.engine_model = engine_model;
            this.engine_type = engine_type;
            this.thrust_rating = thrust_rating;
            this.has_glass_cockpit = has_glass_cockpit;
            this.is_ETOPS_certified = is_ETOPS_certified;
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

    public void set_thrust_rating(int thrust_rating) {
        this.thrust_rating = thrust_rating;
    }

    public int get_thrust_rating() {
        return thrust_rating;
    }

    public void set_glass_cokpit(boolean has_glass_cockpit) {
        this.has_glass_cockpit = has_glass_cockpit;
    }

    public boolean get_glass_cockpit() {
        return has_glass_cockpit;
    }

    public void set_ETOPS_certification(boolean is_ETOPS_certified) {
        this.is_ETOPS_certified = is_ETOPS_certified;
    }

    public boolean get_ETOPS_certification() {
        return is_ETOPS_certified;
    }
}