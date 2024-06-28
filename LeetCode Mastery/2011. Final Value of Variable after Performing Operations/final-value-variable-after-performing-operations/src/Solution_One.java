import java.util.Arrays;

/*
 * Solution 1
 * - single pass
 * - O(n)
 * - runtime: 1 ms
 * - memory: 42.14 MB
 */
public class Solution_One {
    public Solution_One(String[] operations) {
        System.out.println("\nSolution 1 -->");
        System.out.println("operations[]: " + Arrays.toString(operations));
        System.out.println("output: " + finalValueAfterOperations(operations));
    }

    public static int finalValueAfterOperations(String[] operations) {
        int X = 0;
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "++X":
                    X++;
                    break;
                case "X++":
                    X++;
                    break;
                case "--X":
                    X--;
                    break;
                case "X--":
                    X--;
                    break;
                default:
                    throw new AssertionError();
            }
        }
        return X;
    }
}