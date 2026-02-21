package com.questions.contains_duplicate;

import java.util.Arrays;

public class Main {
    /*
        Leetcode #217 - Contains Duplicate (Java impl.)
        - Difficulty: easy
        - Topics: array, hash table, sorting

        Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.

        Example 1)
         Input: nums = [1, 2, 3, 1]
         Output: true

        Example 2)
         Input: nums = [1, 2, 3, 4]
         Output: false

        Example 3)
         Input: nums = [1, 1, 1, 3, 3, 4, 3, 2, 4, 2]
         Output: true

        Constrains:
        * 1 <= nums.length <= 10^5
        * -10^9 <= nums[i] <= 10^9
    */
    public static void main(String[] args) {
        // SolutionOne sol1 = new SolutionOne();
        SolutionTwo sol1 = new SolutionTwo();
        
        int[] nums = {1, 2, 3, 1};
        System.out.println("\nExample 1)\n----------");
        System.out.println("nums: " + Arrays.toString(nums));
        System.out.println("Output: " + sol1.containsDuplicate(nums));

        nums = new int[] {1, 2, 3, 4};
        System.out.println("\nExample 2)\n----------");
        System.out.println("nums: " + Arrays.toString(nums));
        System.out.println("Output: " + sol1.containsDuplicate(nums));

        nums = new int[] {1, 1, 1, 3, 3, 4, 3, 2, 4, 2};
        System.out.println("\nExample 3)\n----------");
        System.out.println("nums: " + Arrays.toString(nums));
        System.out.println("Output: " + sol1.containsDuplicate(nums));
    }
}