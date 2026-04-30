package com.leetcode;

import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        System.out.println("\nLeetcode 217. Contains Duplicate");
        System.out.println("-----------------------------------\n");

        /*
            Given an integer nums, return true if any value appears at least twice in the array, and return false if every element is distinct.

            Example 1:
             Input: nums = [1, 2, 3, 1]
             Output: true

            Example 2:
             Input: nums = [1, 2, 3, 4]
             Output: false

            Example 3:
             Input: nums = [1, 1, 1, 3, 3, 4, 3, 2, 4, 2]
             Output: true

            Constraints:
            * 1 <= nums.length <= 10^5
            * -10^9 <= nums[i] <= 10^9
        */

        Solution solution = new Solution();
        int nums[];

        System.out.println("\nExample 1 -->");
        nums = new int[] {1, 2, 3, 1};
        System.out.println(" Input: " + Arrays.toString(nums));
        System.out.println(" Output: " + solution.containsDuplicate(nums));

        System.out.println("\nExample 2 -->");
        nums = new int[] {1, 2, 3, 4};
        System.out.println(" Input: " + Arrays.toString(nums));
        System.out.println(" Output: " + solution.containsDuplicate(nums));

        System.out.println("\nExample 3 -->");
        nums = new int[] {1, 1, 1, 3, 3, 4, 3, 2, 4, 2};
        System.out.println(" Input: " + Arrays.toString(nums));
        System.out.println(" Output: " + solution.containsDuplicate(nums));
    }
}