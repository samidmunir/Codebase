package com.questions.valid_anagram;

import java.util.Arrays;

/*
    Runtime: 3ms
    Memory: 46.34MB
*/
public class SolutionTwo {
    public boolean isAnagram(String s, String t) {
        if (t.length() != s.length()) {
            return false;
        }

        char[] sChars = s.toCharArray();
        char[] tChars = t.toCharArray();
        
        Arrays.sort(sChars);
        Arrays.sort(tChars);

        return Arrays.equals(sChars, tChars);
    }
}