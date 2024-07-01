
import java.util.Arrays;

/*
 * Solution 1
 * - double pass
 * - O(n^2)
 * - runtime: 0 ms
 * - memory: 42.58 MB
 */
public class Solution_One {
    public Solution_One(int[][] accounts) {
        System.out.println("input[]: " + Arrays.deepToString(accounts));
        System.out.println("output: " + maximumWealth(accounts));
    }
    
    public static int maximumWealth(int[][] accounts) {
        int maxWealth = Integer.MIN_VALUE;
        for (int i = 0; i < accounts.length; i++) {
            int sum = 0;
            for (int j = 0; j < accounts[i].length; j++) {
                sum += accounts[i][j];
            }
            maxWealth = Integer.max(maxWealth, sum);
        }
        return maxWealth;
    }
}