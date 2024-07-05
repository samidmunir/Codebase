public class SolutionAlpha {
    public SolutionAlpha(int x) {
        System.out.println("\nSolution Alpha -->");
        System.out.println("x: " + x);
        System.out.println("output: " + isPalindrome(x));
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
     * Runtime: 7 ms
     * Memory: 44.49 MB
     * This solution encompasses an approach where we convert the integer x into
     *  two strings A, B. We will traverse A from left to right and B from right
     *  to left in a single loop, and we will check if A.charAt(i) == B.charAt(n - 1).
     * N represents A.length() & B.length().
     * This solution has a time complexity of O(n/10) because we will loop
     *  the number of times 10 fits into x so x / 10.
     */
    public static boolean isPalindrome(int x) {
        if (x < 0) {
            return false;
        }
        String a = String.valueOf(x);
        if (a.length() == 1) {
            return true;
        }
        String b = String.valueOf(x);
        int i = 0;
        int j = b.length() - 1;
        while (i < a.length() && j >= 0) {
            if (a.charAt(i) != b.charAt(j)) {
                return false;
            }
            i++;
            j--;
        }
        return true;
    }
}