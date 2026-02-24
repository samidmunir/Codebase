package com.questions.group_anagrams;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/*
    Runtime: 17ms
    Memory: 49.74MB
*/
public class SolutionThree {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> strsMap = new HashMap<>();

        for (String s : strs) {
            int[] charsCount = new int[26];
            for (char c : s.toCharArray()) {
                charsCount[c - 'a']++;
            }

            StringBuilder sb = new StringBuilder();
            for (int x : charsCount) {
                sb.append('#').append(x);
            }

            String key = sb.toString();

            strsMap.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
        }

        return new ArrayList<>(strsMap.values());
    }
}