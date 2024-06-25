public class App {
    public static void main(String[] args) throws Exception {
        System.out.println("\n11. Container with Most Water");
        /*
         * You are given an integer array height of length n. There are n
         *  vertical lines drawn such that the two endpoints of the ith line
         *  are (i, 0) and (i, height[i]).
         * 
         * Find two lines that together with the x-axis form a container, such
         *  that the container contains the most water.
         * 
         * Return the maximum amount of water a container can store.
         * 
         * Notice that you may not slant the container.
         * 
         * Example 1 
         *  input: height = [1, 8, 6, 2, 5, 4, 8, 3, 7]
         *  output: 49
         * 
         * Example 2
         *  input: height = [1, 1]
         *  output: 1
         */
        int[] height1 = {1, 8, 6, 2, 5, 4, 8, 3, 7};
        Solution_One solution_one = new Solution_One(height1);

        int[] height2 = {1, 1};
        Solution_One solution_one_b = new Solution_One(height2);
    }
}
