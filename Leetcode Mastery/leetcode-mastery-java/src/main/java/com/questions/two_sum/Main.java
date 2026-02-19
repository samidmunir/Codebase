package com.questions.two_sum;

import java.util.Arrays;

public class Main {
    /*
        Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

        You may assume that each input would have exactly one solution, and you may not use the same element twice.

        You can return the answer in any order.

        Example 1)
            Input: nums = [2, 7, 11, 15], target = 9
            Output: [0, 1]

        Example 2)
            Input: nums = [3, 2, 4], target = 6
            Output: [1, 2]

        Example 3)
            Input: nums = [3, 3], target = 6
            Output: [0, 1]
    */
    public static void main(String[] args) {
        SolutionOne sol = new SolutionOne();
        int[] nums;

        nums = new int[] {2, 7, 11, 15};
        System.out.println("\nExample 1)");
        System.out.println("nums = " + Arrays.toString(nums));
        System.out.println("Output: " + Arrays.toString(sol.twoSum(nums, 9)));
        
        nums = new int[] {3, 2, 4};
        System.out.println("\nExample 2)");
        System.out.println("nums = " + Arrays.toString(nums));
        System.out.println("Output: " + Arrays.toString(sol.twoSum(nums, 6)));
        
        nums = new int[] {3, 3};
        System.out.println("\nExample 3)");
        System.out.println("nums = " + Arrays.toString(nums));
        System.out.println("Output: " + Arrays.toString(sol.twoSum(nums, 6)));
    }
}