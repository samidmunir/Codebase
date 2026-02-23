package com.questions.valid_anagram;

public class Main {
    /*
        Leetcode #242 - Valid Anagram (Java impl.)
        - Difficulty: easy
        - Topics: hash table, string, sorting

        Given two strings s and t, return true if t is an anagram of s, and false otherwise.

        Example 1)
         Input: s = "anagram", t = "nagaram"
         Output: true

        Example 2)
         Input: s = "rat", t = "car"
         Output: false

        Constraints
        * 1 <= s.length, t.length <= 5 * 10^4
        * s and t consist of lowercase English letters.
    */
    public static void main(String[] args) {
        // SolutionOne sol1 = new SolutionOne();
        // SolutionTwo sol1 = new SolutionTwo();
        SolutionThree sol1 = new SolutionThree();

        String s = "anagram";
        String t = "nagaram";
        System.out.println("\nExample 1)\n----------");
        System.out.println("s: " + s + ", t: " + t);
        System.out.println("Output: " + sol1.isAnagram(s, t));

        s = new String("rat");
        t = new String("car");
        System.out.println("\nExample 2)\n----------");
        System.out.println("s: " + s + ", t: " + t);
        System.out.println("Output: " + sol1.isAnagram(s, t));

        s = new String("aacc");
        t = new String("ccac");
        System.out.println("\nExample 3)\n----------");
        System.out.println("s: " + s + ", t: " + t);
        System.out.println("Output: " + sol1.isAnagram(s, t));
    }
}