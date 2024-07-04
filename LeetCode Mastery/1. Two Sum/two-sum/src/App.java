public class App {
    public static void main(String[] args) throws Exception {
        /*
         * Given an array of integers nums and an integer target, return indices
         *  of the two numbers such that they add up to target.
         * 
         * You may assume that each input would have exactly one solution, and you
         *  may not use the same element twice.
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
         * Constraints:
         * * 2 <= nums.length <= 10^4
         * * -10^9 <= nums[i] <= 10^9
         * * -10^9 <= target <= 10^9
         * * Only one valid answer exists.
         * 
         * Follow-up: Can you come up with an algorithm that is less than O(n^2)
         *  time complexity?
         */
        System.out.println("\n1. Two Sum");

        int[] numsAlpha = {2, 7, 11, 15};
        int targetAlpha = 9;
        SolutionAlpha solutionAlpha = new SolutionAlpha(numsAlpha, targetAlpha);
        System.out.println(solutionAlpha.getClass());

        int[] numsBravo = {3, 2, 4};
        int targetBravo = 6;
        SolutionBravo solutionBravo = new SolutionBravo(numsBravo, targetBravo);
        System.out.println(solutionBravo.getClass());
    }
}