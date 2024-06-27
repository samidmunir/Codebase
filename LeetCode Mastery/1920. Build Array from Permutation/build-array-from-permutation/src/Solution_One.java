
import java.util.Arrays;

/*
 * Solution 1
 * - single pass
 * - O(n)
 * - runtime: 1 ms
 * - memory: 45.28 MB
 */
public class Solution_One {
    public Solution_One(int[] nums) {
        System.out.println("\nSolution 1 -->");
        System.out.println("nums[]: " + Arrays.toString(nums));
        System.out.println("output: " + Arrays.toString(buildArray(nums)));
    }
    
    public static int[] buildArray(int[] nums) {
        int[] ans = new int[nums.length];
        for (int i = 0; i < nums.length; i++) {
            ans[i] = nums[nums[i]];
        }
        return ans;
    }
}