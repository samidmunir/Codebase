package com.questions.group_anagrams;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/*
    Runtime: 8ms
    Memory: 49.930MB
*/
public class SolutionTwo {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> strsMap = new HashMap<>();

        for (String s : strs) {
            char[] strChars = s.toCharArray();
            Arrays.sort(strChars);
            String key = new String(strChars);

            strsMap.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
        }

        return new ArrayList<>(strsMap.values());
    }
}