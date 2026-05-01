package com.leetcode;

public class Main {
    public static void main(String[] args) {
        System.out.println("\nLeetcode 242. Valid Anagram");
        System.out.println("-----------------------------------\n");

        /*
            Given two strings s and t, return true if t is an anagram of s, and false otherwise.
            
            Example 1:
             Input: s = "anagram", t = "nagaram"
             Output: true

            Example 2:
             Input: s = "rat", t = "car"
             Output: false
            
            Constraints:
            * 1 <= s.length, t.length <= 5 * 10^4
            * s and t consist of lowercase English letters.
        */

        Solution solution = new Solution();
        String s;
        String t;

        System.out.println("\nExample 1 -->");
        s = "anagram";
        t = "nagaram";
        System.out.println(" Input: s = " + s + ", t = " + t);
        System.out.println(" Output: " + solution.isAnagram(s, t));

        System.out.println("\nExample 2 -->");
        s = "rat";
        t = "car";
        System.out.println(" Input: s = " + s + ", t = " + t);
        System.out.println(" Output: " + solution.isAnagram(s, t));
    }
}