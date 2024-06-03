public class Aircraft {
    private String manufacturer;
    private String model;
    private String registration;
    private String airline;
    private short number_of_engines;
    private short range;
    private long max_cruise_level;

    public Aircraft() {}

    public Aircraft(String manufacturer, String model, String registration, String airline, short number_of_engines, short range, long max_cruise_level) {
        this.manufacturer = manufacturer;
        this.model = model;
        this.registration = registration;
        this.airline = airline;
        this.number_of_engines = number_of_engines;
        this.range = range;
        this.max_cruise_level = max_cruise_level;
    }

    public void set_manufacturer(String manufacturer) {
        this.manufacturer = manufacturer;
    }

    public String get_manufacturer() {
        return manufacturer;
    }

    public void set_model(String model) {
        this.model = model;
    }

    public String get_model() {
        return model;
    }

    public void set_registration(String registration) {
        this.registration = registration;
    }

    public String get_registration() {
        return registration;
    }

    public void set_airline(String airline) {
        this.airline = airline;
    }

    public String get_airline() {
        return airline;
    }

    public void set_number_of_engines(short number_of_engines) {
        this.number_of_engines = number_of_engines;
    }

    public short get_number_of_engines() {
        return number_of_engines;
    }

    public void set_range(short range) {
        this.range = range;
    }

    public short get_range() {
        return range;
    }

    public void set_max_cruise_level(long max_cruise_level) {
        this.max_cruise_level = max_cruise_level;
    }

    public long get_max_cruise_level() {
        return max_cruise_level;
    }
}