package com.questions.group_anagrams;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/*
    Runtime: 578ms
    Memory: 49.30MB
*/
public class SolutionOne {
    public List<List<String>> groupAnagrams(String[] strs) {
        List<List<String>> groups = new ArrayList<>();
        boolean[] seenStrs = new boolean[strs.length];

        for (int i = 0; i < strs.length; i++) {
            if (seenStrs[i]) {
                continue;
            }

            List<String> group = new ArrayList<>();
            group.add(strs[i]);
            seenStrs[i] = true;
            
            for (int j = i + 1; j < strs.length; j++) {
                if (!seenStrs[j] && checkIfAnagrams(strs[i], strs[j])) {
                    group.add(strs[j]);
                    seenStrs[j] = true;
                }
            }
            groups.add(group);
        }

        return groups;
    }

    private boolean checkIfAnagrams(String a, String b) {
        if (a.length() != b.length()) {
            return false;
        }

        int[] charsTracker = new int[26];
        Arrays.fill(charsTracker, 0);

        for (int i = 0; i < a.length(); i++) {
            charsTracker[a.charAt(i) - 'a']++;
            charsTracker[b.charAt(i) - 'a']--;
        }

        for (int i = 0; i < charsTracker.length; i++) {
            if (charsTracker[i] != 0) {
                return false;
            }
        }
        
        return true;
    }
}