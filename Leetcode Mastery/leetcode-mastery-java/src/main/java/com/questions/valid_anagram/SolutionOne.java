package com.questions.valid_anagram;

import java.util.HashMap;

/*
    Runtime: 25ms
    Memory: 76.74MB
*/
public class SolutionOne {
    public boolean isAnagram(String s, String t) {
        if (t.length() != s.length()) {
            return false;
        }

        HashMap<Character, Integer> sCharsMap = new HashMap<>();
        HashMap<Character, Integer> tCharsMap = new HashMap<>();

        for (int i = 0; i < s.length(); i++) {
            if (sCharsMap.containsKey(s.charAt(i))) {
                int freq = sCharsMap.get(s.charAt(i));
                freq++;
                sCharsMap.replace(s.charAt(i), freq);
            } else {
                sCharsMap.put(s.charAt(i), 1);
            }
        }

        for (int i = 0; i < t.length(); i++) {
            if (tCharsMap.containsKey(s.charAt(i))) {
                int freq = tCharsMap.get(s.charAt(i));
                freq++;
                tCharsMap.replace(s.charAt(i), freq);
            } else {
                tCharsMap.put(s.charAt(i), 1);
            }
        }

        for (int i = 0; i < t.length(); i++) {
            if (!sCharsMap.containsKey(t.charAt(i))) {
                return false;
            } else {
                if (sCharsMap.get(t.charAt(i)) != tCharsMap.get(t.charAt(i))) {
                    return false;
                }
            }
        }

        return true;
    }
}