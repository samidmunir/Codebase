import java.util.Arrays;

/*
 * Solution 1
 * - double pass
 * - O(n^2)
 * - runtime: 45 ms
 * - memory: 44.90 MB
 */
public class Solution_One {
    public Solution_One(int[] input_nums, int input_target) {
        System.out.println("\nSolution 1 -->");
        System.out.println("nums[]: " + Arrays.toString(input_nums));
        System.out.println("target: " + input_target);
        System.out.println("output: " + Arrays.toString(twoSum(input_nums, input_target)));
    }
    
    private int[] twoSum(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[j] == complement && i != j) {
                    return new int[] {i, j};
                }
            }
        }
        return null;
    }
}