package com.questions.valid_anagram;

import java.util.Arrays;

/*
    Runtime: 6ms
    Memory: 44.37MB
*/
public class SolutionThree {
    public boolean isAnagram(String s, String t) {
        if (t.length() != s.length()) {
            return false;
        }

        int[] charsTracker = new int[26];
        Arrays.fill(charsTracker, 0);

        for (int i = 0; i < s.length(); i++) {
            charsTracker[s.charAt(i) - 'a']++;
            charsTracker[t.charAt(i) - 'a']--;
        }

        for (int i = 0; i < charsTracker.length; i++) {
            if (charsTracker[i] != 0) {
                return false;
            }
        }

        return true;
    }
}