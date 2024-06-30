import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/*
 * Solution 1
 * - double pass
 * - O(n^2)
 * - runtime: 1 ms
 * - memory: 44.82 MB
 */
public class Solution_One {
    public Solution_One(String[] words, char x) {
        System.out.println("\nSolution 1 -->");
        System.out.println("words[]: " + Arrays.toString(words) + ", x: " + x);
        System.out.println("output: " + findWordsContaining(words, x));
    }

    public static List<Integer> findWordsContaining(String[] words, char x) {
        List<Integer> indices = new ArrayList<>();
        for (int i = 0; i < words.length; i++) {
            String word = words[i];
            for (int j = 0; j < word.length(); j++) {
                if (word.charAt(j) == x) {
                    indices.add(i);
                    break;
                }
            }
        }
        return indices;
    }
}