
import java.util.Arrays;

public class StaticArray {
    private final int SIZE_OF_INT = 4;
    private int[] array;
    private int capacity;
    private int pointer;
    private int number_of_elements;

    public StaticArray(int capacity) {
        if (capacity <= 0) {
            System.out.println("\n--<ERROR>-- cannot initialize static_array[] with capacity <= 0.");
        } else {
            this.capacity = capacity;
            array = new int[this.capacity];
            pointer = -1;
            number_of_elements = 0;
            System.out.println("\nSuccessfully initialized static_array[] with capacity " + this.capacity + ".");
        }
        print_static_array_stats();
    }

    private void print_static_array_stats() {
        System.out.println("static_array[]: " + Arrays.toString(array));
        System.out.println("\tpointer: " + pointer);
        System.out.println("\tnumber_of_elements: " + number_of_elements);
        System.out.println("\tused mem: " + (number_of_elements * SIZE_OF_INT) + " bytes");
        System.out.println("\tavail. mem: " + ((capacity * SIZE_OF_INT) - (number_of_elements * SIZE_OF_INT)) + " bytes");
    }
}