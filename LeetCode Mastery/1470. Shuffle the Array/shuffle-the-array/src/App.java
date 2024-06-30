public class App {
    public static void main(String[] args) throws Exception {
        System.out.println("\n1470. Shuffle the Array");
        /*
         * Given the array nums consisting of 2n elements in the form
         *  [x1, x2, ..., xn, y1, y2, ..., yn].
         * 
         * Return the array in the form [x1, y1, x2, y2, ..., xn, yn].
         * 
         * Example 1
         *  input: nums = [2, 5, 1, 3, 4, 7], n = 3
         *  output: [2, 3, 5, 4, 1, 7]
         * 
         * Example 2
         *  input: nums = [1, 2, 3, 4, 4, 3, 2, 1], n = 4
         *  output: [1, 4, 2, 3, 3, 2, 4, 1]
         * 
         * Example 3
         *  input: nums = [1, 1, 2, 2], n = 2
         *  output: [1, 2, 1, 2]
         */
        int[] nums1 = {2, 5, 1, 3, 4, 7};
        int n1 = 3;
        Solution_One solution_one = new Solution_One(nums1, n1);

        int[] nums2 = {1, 2, 3, 4, 4, 3, 2, 1};
        int n2 = 4;
        Solution_One solution_one_b = new Solution_One(nums2, n2);

        int[] nums3 = {1, 1, 2, 2};
        int n3 = 2;
        Solution_One solution_one_c = new Solution_One(nums3, n3);
    }
}
