
import java.util.Arrays;

public class SolutionAlpha {
    public SolutionAlpha(String[] strs) {
        System.out.println("\nSolution Alpha -->");
        System.out.println("strs[]: " + Arrays.toString(strs));
        System.out.println("output: " + longestCommonSubstring(strs));
    }

    public static String longestCommonSubstring(String[] strs) {
        String prefix = "";

        for (int i = 0; i < strs[0].length(); i++) {
            for (int j = 0; j < strs.length; j++) {
                if (i == strs[j].length() || strs[j].charAt(j) != strs[0].charAt(i)) {
                    return prefix;
                }
            }
            prefix += strs[0].charAt(i);
        }
        
        return prefix;
    }
}