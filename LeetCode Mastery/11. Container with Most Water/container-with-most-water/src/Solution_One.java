import java.util.Arrays;

/*
 * Solution 1
 * - two-pointers approach
 * - O(n)
 * - runtime: 6 ms
 * - memory: 58.02 MB
 */
public class Solution_One {
    public Solution_One(int[] height) {
        System.out.println("\nSolution 1 -->");
        System.out.println("height[]: " + Arrays.toString(height));
        System.out.println("output: " + maxArea(height));
    }
    public static int maxArea(int[] height) {
        int maxArea = 0;
        int left = 0, right = height.length - 1;
        
        while (left < right) {
            int area = (right - left) * (Integer.min(height[left], height[right]));
            maxArea = Integer.max(maxArea, area);

            if (height[left] < height[right]) {
                left++;
            } else if (height[left] > height[right]) {
                right--;
            } else {
                right--;
            }
        }
        return maxArea;
    }
}