public class App {
    public static void main(String[] args) throws Exception {
        System.out.println("\n1929. Concatenation of Array");
        /*
         * Given an integer array nums of length n, you want to create
         *  an array ans of length 2n where ans[i] == nums[i] and
         *  ans[i + n] == nums[i] for 0 <= i < n (0-indexed).
         * 
         * Specifically, ans is the concatenation of two nums arrays.
         * 
         * Return the array ans.
         * 
         * Example 1
         *  input: nums = [1, 2, 1]
         *  output: [1, 2, 1, 1, 2, 1]
         * 
         * Example 2
         *  input: nums = [1, 3, 2, 1]
         *  output: [1, 3, 2, 1, 1, 3, 2, 1]
         */
        int[] nums1 = {1, 2, 1};
        Solution_One solution_one = new Solution_One(nums1);

        int[] nums2 = {1, 3, 2, 1};
        Solution_One solution_one_b = new Solution_One(nums2);
    }
}
