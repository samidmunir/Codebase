import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class InstanceLifecycleTest {
    int counter = 0;

    @Test
    void testOne() {
        counter++;
        System.out.println("testOne().this = " + this);
        assertEquals(1, counter);
    }

    @Test
    void testTwo() {
        counter++;
        System.out.println("testTwo().this = " + this);
        assertEquals(1, counter);
    }
}