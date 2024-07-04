
import java.util.Arrays;
import java.util.HashMap;

public class SolutionCharlie {
    public SolutionCharlie(int[] nums, int target) {
        System.out.println("\nSolution Charlie -->");
        System.out.println("nums[]: " + Arrays.toString(nums));
        System.out.println("target: " + target);
        System.out.println("--> output: " + Arrays.toString(twoSum(nums, target)));
    }
    
    /*
     * Solution Charlie -->
     * 1. Loop through nums starting from 0 ...(n)
     * 1.1 At each iteration, compute the complement = target - nums[i]
     * 1.2 Check if the complement exists in the HasMap
     * 1.2.1 If yes, then check if the complement's index != i (current index).
     * 1.2.1.1 If distinct elements, then return the two indices.
     * 1.2.2 If no, then place (nums[i], i) --> HashMap
     * ------------------------------------------------------------------------
     * Analysis
     * ________
     * Runtime: 2 ms
     * Memory: 44.81 MB
     * This solution encompasses a single pass HashMap solution. The loop will
     *  iterate through nums[] from 0...n and in each iteration, we will first
     *  compute the complement. In a single-pass manner, we will also check
     *  then, if the complement exists in our HashMap. If it does, then we can
     *  check if the corresponding index != i. If this is the case, then return.
     *  Storing these values in such a manner will enhance our search/look-up 
     *  time. This results in a time complexity of O(n) where we traverse nums[]
     *  only once.
     */
    public static int[] twoSum(int[] nums, int target) {
        HashMap<Integer, Integer> numsMap = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (numsMap.containsKey(complement)) {
                if (numsMap.get(complement) != i) {
                    return new int[] {i, numsMap.get(complement)};
                }
            } else {
                numsMap.put(nums[i], i);
            }
        }
        return null;
    }
}