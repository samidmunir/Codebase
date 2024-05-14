public class App {
    public static void main(String[] args) throws Exception {
        System.out.println("\nstatic-array | implementation in Java");
        System.out.println("-------------------------------------");

        /*
         * Testing StaticArray object initialization + function print_static_array_stats()
         */
        StaticArray array = new StaticArray(4);
        
        /*
         * Testing functions insert_head() + shift_right()
         */
        array.insert_head(2);
        array.insert_head(7);
        array.insert_head(11);
        array.insert_head(56);
        array.insert_head(123); // ERROR expected: static_array[] at full capacity.

        /*
         * Testing functions remove_head() + shift_left()
         */
        array.remove_head();
        array.remove_head();
        array.remove_head();
        array.remove_head();
        array.remove_head(); // ERROR expected: static_array[] empty/null.

        /*
         * Testing function insert_tail()
         */
        array.insert_tail(2);
        array.insert_tail(7);
        array.insert_head(11);
        array.insert_tail(56);
        array.insert_tail(123); // ERROR expected: static_array[] at full capacity.

        /*
         * Testing function replace_data_at_index()
         */
        array.replace_data_at_index(123, 3);
        array.remove_head();
        array.remove_head();
        array.replace_data_at_index(125, 3); // ERROR expected: index parameter > pointer
    }
}