
import java.util.Arrays;

/*
 * Solution 1
 * - double pass
 * - O(n^2)
 * - runtime: 1 ms
 * - memory: 40.63 MB
 */
public class Solution_One {
    public Solution_One(int[] nums) {
        System.out.println("\nSolution 1 -->");
        System.out.println("nums[]: " + Arrays.toString(nums));
        System.out.println("output: " + numIdenticalPairs(nums));
    }
    
    public static int numIdenticalPairs(int[] nums) {
        int count = 0;
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[i] == nums[j] && i < j) {
                    count++;
                }
            }
        }
        return count;
    }
}