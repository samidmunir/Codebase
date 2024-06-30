import java.util.Arrays;

/*
 * Solution 1
 * - single pass
 * - O(n)
 * - runtime: 0 ms
 * - memory: 44.42 MB
 */
public class Solution_One {
    public Solution_One(int[] nums, int n) {
        System.out.println("\nSolution 1 -->");
        System.out.println("nums[]: " + Arrays.toString(nums) + ", n = " + n);
        System.out.println("output: " + Arrays.toString(shuffle(nums, n)));
    }

    public static int[] shuffle(int[] nums, int n) {
        /*
         * [0, 1, 2, 3, 4, 5]
         * ------------------
         * [2, 5, 1, 3, 4, 7], n = 3
         *      |   |
         *      |   |
         *      |   |
         * [0, 1, 2, 3, 4, 5]
         * ------------------
         * [2, 3, 5, 4, 1, 7]
         */
        int[] result = new int[2 * n];
        for (int i = 0; i < n; i++) {
            result[2 * i] = nums[i];
            result[2 * i + 1] = nums[i + n];
        }
        return result;
    }
}