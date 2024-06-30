public class App {
    public static void main(String[] args) throws Exception {
        System.out.println("\n2942. Find Words Containing Character");
        /*
         * You are given a 0-indexed array of strings words and a character x.
         * 
         * Return an array of indices representing the words that contain the
         *  character x.
         * 
         * Note that the returned array may be in any order.
         * 
         * Example 1
         *  input: words = ["leet", "code"], x = "e"
         *  output: [0, 1]
         * 
         * Example 2
         *  input: words = ["abc", "bcd", "aaaa", "cbc"], x = "a"
         *  output: [0, 2]
         * 
         * Example 3
         *  input: words = ["abc", "bcd", "aaaa", "cbc"], x = "z"
         *  output: []
         */
        String[] words1 = {"leet", "code"};
        char x1 = 'e';
        Solution_One solution_one = new Solution_One(words1, x1);

        String[] words2 = {"abc", "bcd", "aaaa", "cbc"};
        char x2 = 'a';
        Solution_One solution_one_b = new Solution_One(words2, x2);

        String[] words3 = {"abc", "bcd", "aaaa", "cbc"};
        char x3 = 'z';
        Solution_One solution_one_c = new Solution_One(words3, x3);
    }
}
