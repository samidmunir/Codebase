public class App {
    public static void main(String[] args) throws Exception {
        /*
         * Write a function to find the longest common prefix string amongst
         *  an array of strings.
         * 
         * If there is no common prefix, return an empty string "".
         * 
         * Example 1
         *  input: strs = ["flower", "flow", "flight"]
         *  output: "fl"
         * 
         * Example 2
         *  input: strs = ["dog", "racecar", "car"]
         *  output: ""
         */
        System.out.println("\n14. Longest Common Prefix");

        String[] strsAlpha = {"flower", "flow", "flight"};
        SolutionAlpha solutionAlpha = new SolutionAlpha(strsAlpha);
        System.out.println(solutionAlpha.getClass());
    }
}
