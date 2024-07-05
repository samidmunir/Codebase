public class SolutionBravo {
    public SolutionBravo(int x) {
        System.out.println("\nSolution Bravo -->");
        System.out.println("x: " + x);
        System.out.println("output: " + isPalindrome(x));
    }

    /*
     * Solution Bravo -->
     * 1. If x < 0 -> RETURN FALSE
     * 1.1 If x >= 0 && x < 10 -> RETURN TRUE
     * 2. ELSE -->  We can create two separate integer variables A and B.
     * 3. We will use modulo and division operations to test and check if 
     *      x is a palindrome by extracting digits from the left and right.
     * 3. Copy x -> A and x -> B
     * 4. Compute how many digits are in x by seeing how many times we can divide
     *      x by 10.
     * 4.1 Use this variable to start from the largest units place "on the left".
     * 4.2 We will start from the ones' units place "on the right".
     * 5. We will keep track of both instances and make sure digits in corresponding
     *      locations are equal to each other.
     * 6. If a mismatch occurs -> RETURN FALSE
     * ------------------------------------------------------------------------
     * Analysis
     * ________
     * Runtime: 8 ms
     * Memory: 44.36 MB
     * This solution has a time complexity of O(n/10) because we will loop
     *  the number of times 10 fits into x so x / 10; basically the number of 
     *  digits x has.
     */
    public static boolean isPalindrome(int x) {
        if (x < 0) {
            return false;
        }
        if (x == 0 || (x > 0 && x < 10)) {
            return true;
        }
        int units = 0;
        int xCopy = x;
        while (xCopy > 0) {
            xCopy /= 10;
            units++;
        }
        int a = x;
        int b = x;
        while (a > 0 && b > 0) {
            int largestDigit = a / ((int) (Math.pow(10, (units - 1))));
            int temp = a % ((int) (Math.pow(10, units - 1)));
            a = temp;
            int smallestDigit = b % 10;
            b /= 10;
            if (largestDigit != smallestDigit) {
                return false;
            }
            units--;
        }
        return true;
    }
}