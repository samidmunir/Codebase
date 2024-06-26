public class App {
    public static void main(String[] args) throws Exception {
        System.out.println("\n1920. Build Array from Permutation");
        /*
         * Given a zero-based permutation nums (0-indexed), build an array ans of the same
         *  length where ans[i] = nums[nums[i]] for each 0 <= i < nums.length and return it.
         * 
         * A zero-based permutation nums is an array of distinct integers from 0 to
         *  nums.length - 1 (inclusive).
         * 
         * Example 1
         *  input: nums = [0, 2, 1, 5, 3, 4]
         *  output: [0, 1, 2, 4, 5, 3]
         * 
         * Example 2
         *  input: nums = [5, 0, 1, 2, 3, 4]
         *  output: [4, 5, 0, 1, 2, 3]
         */
        int[] nums1 = {0, 2, 1, 5, 3, 4};
        Solution_One solution_one = new Solution_One(nums1);

        int[] nums2 = {5, 0, 1, 2, 3, 4};
        Solution_One solution_one_b = new Solution_One(nums2);
    }
}
