
import java.util.HashMap;

public class SolutionAlpha {
    public SolutionAlpha(String s) {
        System.out.println("\nSolution Alpha -->");
        System.out.println("s: " + s);
        System.out.println("output: " + romanToInt(s));
    }
    
    /*
     * Solution Alpha -->
     * 1. We can create two separate strings that represent x.
     * 2. Loop through A from left to right and loop through B
     *      from right to left.
     * 2.1 At each iteration, compare if the corresponding characters
     *      match in the strings when read from both directions.
     * 2.1.1 If there is not a match in any of the n iterations, return false.
     * 2.1.2. Else, return true. This means we have traversed the characters
     *          in A (left to right) and in B (right to left) without any 
     *          mismatches.
     * ------------------------------------------------------------------------
     * Analysis
     * ________
     * Runtime: 6 ms
     * Memory: 45.41 MB
     * This solution encompasses an approach where we convert the integer x into
     *  two strings A, B. We will traverse A from left to right and B from right
     *  to left in a single loop, and we will check if A.charAt(i) == B.charAt(n - 1).
     * N represents A.length() & B.length().
     * This solution has a time complexity of O(n/10) because we will loop
     *  the number of times 10 fits into x so x / 10.
     */
    public static int romanToInt(String s) {
        if ("".equals(s)) {
            return 0;
        }
        HashMap<Character, Integer> romansMap = new HashMap<>();
        romansMap.put('I', 1);
        romansMap.put('V', 5);
        romansMap.put('X', 10);
        romansMap.put('L', 50);
        romansMap.put('C', 100);
        romansMap.put('D', 500);
        romansMap.put('M', 1000);

        int result = 0;
        for (int i = 0; i < s.length(); i++) {
            if (i == s.length() - 1) {
                result += romansMap.get(s.charAt(i));    
                return result;
            }
            if (romansMap.get(s.charAt(i)) >= romansMap.get(s.charAt(i + 1))) {
                result += romansMap.get(s.charAt(i));
            } else {
                result -= romansMap.get(s.charAt(i));
            }
        }
        return result;
    }
}