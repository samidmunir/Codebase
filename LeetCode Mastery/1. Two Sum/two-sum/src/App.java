public class App {
    public static void main(String[] args) throws Exception {
        System.out.println("\n1. Two Sum");
        /*
         * Given an array of integers nums and an integer target, return
         *  indices of the two numbers such that they add up to target.
         * 
         * You may assume that each input would have exactly one solution,
         *  and you may not use the same element twice.
         * 
         * You can return the answer in any order.
         * 
         * Example 1
         *  input: nums = [2, 7, 11, 15], target = 9
         *  output: [0, 1]
         * 
         * Example 2
         *  input: nums = [3, 2, 4], target = 6
         *  output: [1, 2]
         * 
         * Example 3
         *  input: nums = [3, 3], target = 6
         *  output: [0, 1]
         * 
         * Follow-up: Can you come up with an algorithm that is less than
         *  O(n^2) time complexity?
         */
        int[] nums1 = {2, 7, 11, 15};
        int target_1 = 9;
        Solution_One solution_one = new Solution_One(nums1, target_1);

        int[] nums2 = {3, 2, 4};
        int target_2 = 6;
        Solution_Two solution_two = new Solution_Two(nums2, target_2);

        int[] nums3 = {3, 3};
        int target_3 = 6;
        Solution_Three solution_three = new Solution_Three(nums3, target_3);
    }
}