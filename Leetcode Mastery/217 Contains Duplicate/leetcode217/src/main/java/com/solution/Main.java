package com.solution;

import java.util.Arrays;
import java.util.HashSet;

public class Main {
    public static void main(String[] args) {
        /*
            Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.

            Example 1:
             Input: nums = [1, 2, 3, 1]
             Output: true

            Example 2:
             Input: nums = [1, 2, 3, 4]
             Output: false
            
            Example 3:
             Input: nums = [1, 1, 1, 3, 3, 4, 3, 2, 4, 2]
             Output: true
         */


        System.out.println("\nExample 1 -->");
        int[] nums = {1, 2, 3, 1};
        System.out.println("Input: " + Arrays.toString(nums));
        System.out.println("Output: " + containsDuplicate(nums));

        System.out.println("\nExample 2 -->");
        nums = new int[] {1, 2, 3, 4};
        System.out.println("Input: " + Arrays.toString(nums));
        System.out.println("Output: " + containsDuplicate(nums));

        System.out.println("\nExample 3 -->");
        nums = new int[] {1, 1, 1, 3, 3, 4, 3, 2, 4, 2};
        System.out.println("Input: " + Arrays.toString(nums));
        System.out.println("Output: " + containsDuplicate(nums));
    }

    private static boolean containsDuplicate(int[] nums) {
        HashSet<Integer> numsSet = new HashSet<>();

        for (int i = 0; i < nums.length; i++) {
            if (numsSet.contains(nums[i])) {
                return true;
            } else {
                numsSet.add(nums[i]);
            }
        }
        return false;
    }
}