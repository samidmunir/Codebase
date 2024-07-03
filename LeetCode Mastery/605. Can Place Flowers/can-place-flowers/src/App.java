public class App {
    public static void main(String[] args) throws Exception {
        System.out.println("\n605. Can Place Flowers");
        /*
         * You have a long flowerbed in which some of the plots are planted, and some are not.
         *  However, flowers cannot be planted in adjacent plots.
         * 
         * Given an integer array flowerbed containing 0's and 1's, where 0 means empty and 1
         *  means not empty, and an integer n, return true if n flowers can be planted in the
         *  flowerbed without violating the no-adjacent-flowers rule and false otherwise.
         * 
         * Example 1
         *  input: flowerbed = [1, 0, 0, 0, 1], n = 1
         *  output: true
         * 
         * Example 2
         *  input: flowerbed = [1, 0, 0, 0, 1], n = 2
         *  output: false
         */
        int[] flowerbed1 = {1, 0, 0, 0, 1};
        int n1 = 1;
        Solution_One solution_one = new Solution_One(flowerbed1, n1);

        int[] flowerbed2 = {1, 0, 0, 0, 1};
        int n2 = 2;
        Solution_One solution_one_b = new Solution_One(flowerbed2, n2);

        int[] flowerbed3 = {0, 0, 1, 0, 0};
        int n3 = 1;
        Solution_One solution_one_c = new Solution_One(flowerbed3, n3);
    }
}
