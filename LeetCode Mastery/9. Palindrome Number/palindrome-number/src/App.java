public class App {
    public static void main(String[] args) throws Exception {
        System.out.println("Hello, World!");
        /*
         * Given an integer x, return true if x is a palindrome, and false
         *  otherwise.
         * 
         * Example 1
         *  input: x = 121
         *  output: true
         * 
         * Example 2
         *  input: x = -121
         *  output: false
         * 
         * Example 3
         *  input: x = 10
         *  output: false
         * 
         * Follow-up: Could you solve it without converting the integer to
         *  a string?
         */
        System.out.println("\n9. Palindrome Number");

        int xAlpha = 1221;
        SolutionAlpha solutionAlpha = new SolutionAlpha(xAlpha);
        System.out.println(solutionAlpha.getClass());

        int xBravo = 12321;
        SolutionBravo solutionBravo = new SolutionBravo(xBravo);
        System.out.println(solutionBravo.getClass());
    }
}
