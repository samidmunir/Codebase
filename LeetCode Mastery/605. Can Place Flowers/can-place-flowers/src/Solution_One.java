import java.util.Arrays;

/*
 * Solution 1
 * - single pass
 * - O(n)
 * - runtime: 1 ms
 * - memory: 45.84 MB
 */
public class Solution_One {
    public Solution_One(int[] flowerbed, int n) {
        System.out.println("\nSolution 1 -->");
        System.out.println("flowerbed[]: " + Arrays.toString(flowerbed) + ", n = " + n);
        System.out.println("output: " + canPlaceFlowers(flowerbed, n));
    }
    
    public static boolean canPlaceFlowers(int[] flowerbed, int n) {
        int count = 0;
        for (int i = 0; i < flowerbed.length; i++) {
            if (flowerbed[i] == 0) {
                int previous = (i == 0 || flowerbed[i - 1] == 0) ? 0 : 1;
                int next = (i == flowerbed.length - 1 || flowerbed[i + 1] == 0) ? 0 : 1;
                if (previous == 0 && next == 0) {
                    flowerbed[i] = 1;
                    count++;
                }
            }
        }
        return count >= n;
    }
}