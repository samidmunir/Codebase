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
    }
}