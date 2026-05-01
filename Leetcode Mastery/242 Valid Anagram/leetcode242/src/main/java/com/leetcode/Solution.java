package com.leetcode;

import java.util.HashMap;

public class Solution {
    /*
        This algorithm utilizes two HashSet data structures to count the frequency of each distinct character present both in s and t respectively. This is essential because anagrams are words that are of the same length and contain the same number/frequency of distinct characters present in both strings. The algorithm then loops through the characters of t and checks whether that element exists in the sMap, and then verify if the frequency of that character matches the frequency of that same character in the tMap.

        If there is a mismatch in the frequency count or the presence of an element between s and t, the algorithm returns false.

        This is a single-pass approach where the algorithm loops through s and t, and the loops one final time through t to verify frequency counts in s.

        Leetcode -->
         Runtime: 24 ms
         Memory: 47.30 MB

        Neetcode -->
         Runtime: 147 ms
         Memory: 62.2 MB
    */
    public boolean isAnagram(String s, String t) {
        if (t.length() != s.length()) {
            return false;
        }

        HashMap<Character, Integer> sMap = new HashMap<>();
        HashMap<Character, Integer> tMap = new HashMap<>();

        for (int i = 0; i < s.length(); i++) {
            if (!sMap.containsKey(s.charAt(i))) {
                sMap.put(s.charAt(i), 1);
            } else {
                int freq = sMap.get(s.charAt(i));
                freq++;
                sMap.put(s.charAt(i), freq);
            }
        }

        for (int i = 0; i < t.length(); i++) {
            if (!tMap.containsKey(t.charAt(i))) {
                tMap.put(t.charAt(i), 1);
            } else {
                int freq = tMap.get(t.charAt(i));
                freq++;
                tMap.put(t.charAt(i), freq);
            }
        }

        for (int i = 0; i < t.length(); i++) {
            if (sMap.containsKey(t.charAt(i)) && sMap.get(t.charAt(i)).equals(tMap.get(t.charAt(i)))) {
                continue;
            } else {
                return false;
            }
        }

        return true;
    }
}