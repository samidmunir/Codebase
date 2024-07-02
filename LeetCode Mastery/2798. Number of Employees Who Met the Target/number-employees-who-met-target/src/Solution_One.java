
import java.util.Arrays;

/*
 * Solution 1
 * - single pass
 * - O(n)
 * - runtime: 1 ms
 * - memory: 42.11 MB
 */
public class Solution_One {
    public Solution_One(int[] hours, int target) {
        System.out.println("\nSolution 1 -->");
        System.out.println("hours[]: " + Arrays.toString(hours) + ", target: " + target);
        System.out.println("output: " + numberOfEmployeesWhoMetTarget(hours, target));
    }
    
    public static int numberOfEmployeesWhoMetTarget(int[] hours, int target) {
        int numEmployees = 0;
        for (int i = 0; i < hours.length; i++) {
            if (hours[i] >= target) {
                numEmployees++;
            }
        }
        return numEmployees;
    }
}