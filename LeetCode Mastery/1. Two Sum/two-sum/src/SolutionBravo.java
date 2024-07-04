import java.util.Arrays;
import java.util.HashMap;

public class SolutionBravo {
    public SolutionBravo(int[] nums, int target) {
        System.out.println("\nSolution Bravo -->");
        System.out.println("nums[]: " + Arrays.toString(nums));
        System.out.println("target: " + target);
        System.out.println("--> output: " + Arrays.toString(twoSum(nums, target)));
    }

    /*
     * Solution Bravo -->
     * 1. Loop through nums starting from 0 ...(n)
     * 1.1 At each iteration place nums[i] into HashMap.
     * 2. Use a secondary for loop to traverse nums[] from (i) ...(n).
     * 2.1 Compute the complement for each nums[i].
     * 2.1.1 Check if complement exists in HashMap.
     * 2.1.2 Also confirm i != j.
     * ------------------------------------------------------------------------
     * Analysis
     * ________
     * Runtime: 4 ms
     * Memory: 44.24 MB
     * This solution encompasses a double pass solution. The first for loop will
     *  place each element and its corresponding index in a HashMap. Storing these
     *  values in such a manner will enhance our search/look-up time. This is a 
     *  brute-force approach which aims to check each possible pair of indices
     *  which add up to the target. This results in a time complexity of O(2n)
     *  --> O(n).
     */
    public static int[] twoSum(int[] nums, int target) {
        HashMap<Integer, Integer> numsMap = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            numsMap.put(nums[i], i);
        }
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (numsMap.containsKey(complement) && numsMap.get(complement) != i) {
                return new int[] {i, numsMap.get(complement)};
            }
        }
        return null;
    }
}