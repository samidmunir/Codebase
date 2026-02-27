package questions.int_wrapper;

import java.util.HashSet;

public class Main {

    public static void main(String[] args) {

        System.out.println("=== IntWrapper Tests ===\n");

        // 1️⃣ Basic creation
        IntWrapper a = new IntWrapper(10);
        IntWrapper b = new IntWrapper(5);

        System.out.println("a = " + a);
        System.out.println("b = " + b);

        // 2️⃣ Arithmetic (immutability test)
        IntWrapper sum = a.add(5);
        IntWrapper diff = a.subtract(3);
        IntWrapper product = a.multiply(2);
        IntWrapper quotient = a.divide(2);

        System.out.println("\n--- Arithmetic ---");
        System.out.println("a + 5 = " + sum);
        System.out.println("a - 3 = " + diff);
        System.out.println("a * 2 = " + product);
        System.out.println("a / 2 = " + quotient);

        // Check immutability
        System.out.println("\nOriginal a still = " + a);

        // 3️⃣ equals() test
        IntWrapper c = new IntWrapper(10);

        System.out.println("\n--- Equality ---");
        System.out.println("a equals c? " + a.equals(c));
        System.out.println("a equals b? " + a.equals(b));

        // 4️⃣ compareTo()
        System.out.println("\n--- compareTo ---");
        System.out.println("a compareTo b = " + a.compareTo(b)); // > 0
        System.out.println("b compareTo a = " + b.compareTo(a)); // < 0
        System.out.println("a compareTo c = " + a.compareTo(c)); // 0

        // 5️⃣ Number conversions
        System.out.println("\n--- Number Conversions ---");
        System.out.println("intValue: " + a.intValue());
        System.out.println("longValue: " + a.longValue());
        System.out.println("floatValue: " + a.floatValue());
        System.out.println("doubleValue: " + a.doubleValue());

        // 6️⃣ HashSet test (tests equals + hashCode consistency)
        System.out.println("\n--- HashSet Test ---");
        HashSet<IntWrapper> set = new HashSet<>();
        set.add(a);
        set.add(c); // should NOT add duplicate

        System.out.println("Set size (should be 1): " + set.size());

        System.out.println("\n=== Tests Complete ===");
    }
}