import java.util.Arrays;
import java.util.HashMap;

/*
 * Solution Three
 * - single pass HashMap
 * - O(n)
 * - runtime: 2 ms
 * - memory: 44.79 MB
 */
public class Solution_Three {
    public Solution_Three(int[] input_nums, int input_target) {
        System.out.println("\nSolution 3 -->");
        System.out.println("nums[]: " + Arrays.toString(input_nums));
        System.out.println("target: " + input_target);
        System.out.println("output: " + Arrays.toString(twoSum(input_nums, input_target)));
    }
    
    private int[] twoSum(int[] nums, int target) {
        HashMap<Integer, Integer> nums_map = new HashMap<>();
        nums_map.put(nums[0], 0);
        for (int i = 1; i < nums.length; i++) {
            int complement = target - nums[i];
            if (nums_map.containsKey(complement) && (nums_map.get(complement) != i)) {
                return new int[] {i, nums_map.get(complement)};
            } else {
                nums_map.put(nums[i], i);
            }
        }
        return null;
    }
}