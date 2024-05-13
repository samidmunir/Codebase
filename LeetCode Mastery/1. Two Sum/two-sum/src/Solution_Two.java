import java.util.Arrays;
import java.util.HashMap;

/*
 * Solution 2
 * - double pass HashMap
 * - O(n^2) but better access time
 * - runtime: 4 ms
 * - memory: 44.61 MB
 */
public class Solution_Two {
    public Solution_Two(int[] input_nums, int input_target) {
        System.out.println("\nSolution 2 -->");
        System.out.println("nums[]: " + Arrays.toString(input_nums));
        System.out.println("target: " + input_target);
        System.out.println("output: " + Arrays.toString(twoSum(input_nums, input_target)));
    }
    
    private int[] twoSum(int[] nums, int target) {
        HashMap<Integer, Integer> nums_map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            nums_map.put(nums[i], i);
        }
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (nums_map.containsKey(complement) && (nums_map.get(complement) != i)) {
                return new int[] {i, nums_map.get(complement)};
            }
        }
        return null;
    }
}