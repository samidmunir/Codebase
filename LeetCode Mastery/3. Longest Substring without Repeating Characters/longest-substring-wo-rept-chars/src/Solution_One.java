import java.util.HashSet;

/*
 * Solution 1
 * - single pass
 * - O(n)
 * - runtime: 7 ms
 * - memory: 44.38 MB
 */
public class Solution_One {
    public Solution_One(String s) {
        System.out.println("\nSolution 1 -->");
        System.out.println("s: " + s);
        System.out.println("output: " + lengthOfLongestSubstring(s));
    }

    public int lengthOfLongestSubstring(String s) {
        HashSet<Character> chars_set = new HashSet<>();
        int k = 0;
        int l = 0;

        for (int r = 0; r < s.length(); r++) {
            while (chars_set.contains(s.charAt(r))) {
                chars_set.remove(s.charAt(l));
                l++;
            }
            chars_set.add(s.charAt(r));
            k = Integer.max(k, r - l + 1);
        }

        return k;
    }   
}