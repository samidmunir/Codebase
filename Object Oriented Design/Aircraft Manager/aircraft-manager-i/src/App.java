public class App {
    public static void main(String[] args) throws Exception {
        System.out.println("Aircraft Manager v1");

        Aircraft boeing_737 = new Aircraft("Boeing", "737-800 NG", "N158AY", "United Airlines");
        System.out.println(boeing_737);
    }
}