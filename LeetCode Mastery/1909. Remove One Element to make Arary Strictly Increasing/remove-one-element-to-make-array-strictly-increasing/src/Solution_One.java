
import java.util.Arrays;

public class Solution_One {
    public Solution_One(int[] nums) {
        System.out.println("\nSolution 1 -->");
        System.out.println("nums[]: " + Arrays.toString(nums));
        System.out.println("output: " + canBeIncreasing(nums));
    }

    public static boolean canBeIncreasing(int[] nums) {
        for (int i = 0; i < nums.length; i++) {
            if (nums[i - 1] < nums[i] && nums[i] < nums[i] + 1) {
                continue;
            } else {
                return false;
            }
        }
        return true;
    }
}