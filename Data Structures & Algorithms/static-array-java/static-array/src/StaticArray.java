
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

    private boolean is_full() {
        return pointer + 1 == capacity;
    }

    private int[] shift_right(int[] input_array, int input_pointer) {
        for (int i = input_pointer; i > 0; i--) {
            input_array[i] = input_array[i - 1];
        }
        input_array[0] = 0;
        return input_array;
    }

    private int[] shift_left(int[] input_array, int input_pointer) {
        for (int i = 0; i < input_pointer; i++) {
            input_array[i] = input_array[i + 1];
        }
        input_array[input_pointer] = 0;
        return input_array;
    }

    public void insert_head(int data) {
        if (is_full()) {
            System.out.println("--<ERROR>-- cannot insert in full capacity static_array[].");
        } else if (pointer == -1) {
            pointer++;
            array[pointer] = data;
            number_of_elements++;
        } else {
            pointer++;
            array = shift_right(array, pointer);
            array[0] = data;
            number_of_elements++;
        }
        System.out.println("\ninsert_head(" + data + ") called -->");
        print_static_array_stats();
    }

    public void remove_head() {}
}