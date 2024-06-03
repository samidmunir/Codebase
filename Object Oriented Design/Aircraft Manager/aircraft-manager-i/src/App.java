public class App {
    public static void main(String[] args) throws Exception {
        System.out.println("Aircraft Manager v1");

        Aircraft test_aircraft = new Aircraft("Test", "TX700", "N700TX", "Testing Airways", (short) 2, (short) 3000, (long) 41000);
        System.out.println(test_aircraft);
    }
}