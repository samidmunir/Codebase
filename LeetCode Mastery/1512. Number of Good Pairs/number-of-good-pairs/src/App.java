public class App {
    public static void main(String[] args) throws Exception {
        System.out.println("\n1512. Number of Good Pairs");
        /*
         * Given an array of integers nums, return the number of good pairs.
         * 
         * A pair (i, j) is called good if nums[i] == nums[j] and i < j.
         * 
         * Example 1
         *  input: nums = [1, 2, 3, 1, 1, 3]
         *  output: 4
         * 
         * Example 2
         *  input: nums = [1, 1, 1, 1]
         *  output: 6
         * 
         * Example 3
         *  input: nums = [1, 2, 3]
         *  output: 0
         */
        int[] nums1 = {1, 2, 3, 1, 1, 3};
        Solution_One solution_one = new Solution_One(nums1);

        int[] nums2 = {1, 1, 1, 1};
        Solution_One solution_one_b = new Solution_One(nums2);

        int[] nums3 = {1, 2, 3};
        Solution_One solution_one_c = new Solution_One(nums3);
    }
}
