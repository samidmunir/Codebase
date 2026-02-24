package com.questions.top_k_frequent_elements;

import java.util.Arrays;

public class Main {
    /*
        Leetcode #347 - Top K Frequent Elements (Java impl.)
        - Difficulty: medium
        - Topics: array, hash table, divide and conquer, sorting, heap (priority queue), bucket sort, counting, quickselect

        Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.

        Example 1)
         Input: nums = [1, 1, 1, 2, 2, 3], k = 2
         Output: [1, 2]

        Example 2)
         Input: nums = [1], k = 1
         Output: [1]

        Example 3)
         Input: nums = [1, 2, 1, 2, 1, 2, 3, 1, 3, 2], k = 2
         Output: [1, 2]

        Constraints
        * 1 <= nums.length <= 10^5
        * -10^4 <= nums[i] <= 10^4
        * k is in the range [1, the number of unique elements in the array]
        * It is guaranteed that the answer is unique.
    */
    public static void main(String[] args) {
        SolutionOne sol1 = new SolutionOne();

        int[] nums = {1, 1, 1, 2, 2, 3};
        int k = 2;
        System.out.println("\nExample 1)\n----------");
        System.out.println("nums: " + Arrays.toString(nums));
        System.out.println("k: " + k);
        System.out.println("Output: " + Arrays.toString(sol1.topKFrequent(nums, k)));
    }
}