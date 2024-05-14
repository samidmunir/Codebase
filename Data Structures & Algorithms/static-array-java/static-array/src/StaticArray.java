
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

    private boolean is_empty() {
        return pointer == -1;
    }

    private int[] shift_right(int[] input_array, int input_pointer) {
        for (int i = input_pointer; i > 0; i--) {
            input_array[i] = input_array[i - 1];
        }
        input_array[0] = 0;
        return input_array;
    }

    private int[] shift_left(int[] input_array, int input_pointer) {
        for (int i = 0; i < input_pointer + 1; i++) {
            input_array[i] = input_array[i + 1];
        }
        input_array[input_pointer + 1] = 0;
        return input_array;
    }

    public void insert_head(int data) {
        System.out.println("\ninsert_head(" + data + ") called -->");
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
        print_static_array_stats();
    }

    public void remove_head() {
        System.out.println("\nremove_head() called -->");
        if (is_empty()) {
            System.out.println("--<ERROR>-- cannot remove from empty/null static_array[].");
        } else if (pointer == 0) {
            array[0] = 0;
            pointer--;
            number_of_elements--;
        } else {
            pointer--;
            array = shift_left(array, pointer);
            number_of_elements--;
        }
        print_static_array_stats();
    }

    public void insert_tail(int data) {
        System.out.println("\ninsert_tail(" + data + ") called -->");
        if (is_full()) {
            System.out.println("--<ERROR>-- cannot insert in full capacity static_array[].");
        } else {
            pointer++;
            array[pointer] = data;
            number_of_elements++;
        }
        print_static_array_stats();
    }

    public void remove_tail() {
        System.out.println("\nremove_tail() called -->");
        if (is_empty()) {
            System.out.println("--<ERROR>-- cannot remove from empty/null static_array[].");
        } else if (pointer == 0) {
            array[0] = 0;
            pointer--;
            number_of_elements--;
        } else {
            pointer--;
            array[pointer + 1] = 0;
            number_of_elements--;
        }
        print_static_array_stats();
    }

    public void replace_data_at_index(int data, int index) {
        System.out.println("\nreplace_data_at_index(" + data + ", " + index + ") called -->");
        if (is_empty()) {
            System.out.println("--<ERROR>-- cannot replace data at index in empty/null static_array[].");
        } else if (index <= 0 || index > pointer || index >= array.length) {
            System.out.println("--<ERROR>-- cannot replace data in static_array[] at out-of-bounds index.");
        } else {
            array[index] = data;
        }
        print_static_array_stats();
    }

    public void clear_static_array() {
        System.out.println("\nclear_static_array() called -->");
        for (int i = 0; i < array.length; i++) {
            array[i] = 0;
        }
        pointer = -1;
        number_of_elements = 0;
        print_static_array_stats();
    }
}