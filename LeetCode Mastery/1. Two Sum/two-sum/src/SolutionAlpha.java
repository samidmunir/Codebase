
import java.util.Arrays;

public class SolutionAlpha {
    public SolutionAlpha(int[] nums, int target) {
        System.out.println("\nSolution Alpha -->");
        System.out.println("nums[]: " + Arrays.toString(nums));
        System.out.println("target: " + target);
        System.out.println("--> output: " + Arrays.toString(twoSum(nums, target)));
    }

    /*
     * Solution Alpha -->
     * 1. Loop through nums starting from 0 ...(n - 1)
     * 1.1 At each iteration compute the complement --> target - nums[i]
     * 2. Use a secondary/inner for loop to traverse nums[] from (i + 1) ...(n) 
     *  to locate the complement.
     * 2.1 If complement found at nums[j], then return [i, j].
     * 2.1.1 Make sure that i != j.
     * ------------------------------------------------------------------------
     * Analysis
     * ________
     * Runtime: 31 ms
     * Memory: 44.72 MB
     * This solution encompasses a double pass (nested-for-loops) solution. This
     *  is a brute-force approach which aims to check each possible pair of indices
     *  which add up to the target. This results in a time complexity of O(n^2).
     */
    public static int[] twoSum(int[] nums, int target) {
        for (int i = 0; i < nums.length - 1; i++) {
            int complement = target - nums[i];
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[j] == complement) {
                    return new int[] {i, j};
                }
            }
        }
        return null;
    }
}