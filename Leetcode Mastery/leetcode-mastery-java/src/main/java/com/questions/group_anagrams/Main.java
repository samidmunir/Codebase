package com.questions.group_anagrams;

import java.util.Arrays;
import java.util.List;

public class Main {
    /*
        Leetcode #49 - Group Anagrams (Java impl.)
        - Difficulty: medium
        - Topics: array, hash table, string, sorting

        Given an array of strings strs, group the anagrams together. You can return the answer in any order.

        Example 1)
         Input: strs = ["eat", "tea", "tan", "ate", "nat", "bat"]
         Output: [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]]

        Example 2)
         Input: strs = [""]
         Output: [[""]]

        Example 3)
         Input: str = ["a"]
         Output: [["a"]]

        Constraints
        * 1 <= strs.length <= 10^4
        * 0 <= strs[i].length <= 100
        * strs[i] consists of lowercase English letters.
    */
    public static void main(String[] args) {
        SolutionOne sol1 = new SolutionOne();

        String[] strs = {"eat", "tea", "tan", "ate", "nat", "bat"};
        System.out.println("\nExample 1)\n----------");
        System.out.println("strs: " + Arrays.toString(strs));
        List<List<String>> output = sol1.groupAnagrams(strs);
        System.out.println("Output: " + output);
    }
}