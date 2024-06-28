public class App {
    public static void main(String[] args) throws Exception {
        System.out.println("\n2011. Final Value of Variable after Performing Operations");
        /*
         * There is a programming language with only four operations and one variable X:
         *  - ++X and X++ increments the value of the variable X by 1.
         *  - --X and X-- decrements the value of the variable X by 1.
         * 
         * Initially, the value of X is 0.
         * 
         * Given an array of strings operations containing a list of operations, return the
         *  the final value of X after performing all the operations.
         * 
         * Example 1
         *  input: operations = ["--X", "X++", "X++"]
         *  output: 1
         * 
         * Example 2
         *  input: operations = ["++X", "++X", "X++"]
         *  output: 3
         * 
         * Example 3
         *  input: operations = ["X++", "++X", "--X", "X--"]
         *  output: 0
         */
        String[] operations1 = {"--X", "X++", "X++"};
        Solution_One solution_one = new Solution_One(operations1);

        String[] operations2 = {"++X", "++X", "X++"};
        Solution_One solution_one_b = new Solution_One(operations2);

        String[] operations3 = {"X++", "++X", "--X", "X--"};
        Solution_One solution_one_c = new Solution_One(operations3);
    }
}
