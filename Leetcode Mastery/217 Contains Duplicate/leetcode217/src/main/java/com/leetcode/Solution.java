package com.leetcode;

import java.util.HashSet;

public class Solution {
    /*
        This algorithm utilizes a HashSet to maintain the set of integers in the nums[] array. The algorithm will loop nums 0..., n and check if the current integer nums[i] exists within the set. If it does, that means the element is a duplicate. If not, we add it to the HashSet.

        If no duplicates are found (all elements of nums[] are distinct), the algorithm returns false.

        This is a single pass approach that uses additional memory, the HashSet.

        Leetcode -->
         Runtime: 15 ms
         Memory: 93.52 MB

        Neetcode -->
         Runtime: 65 ms
         Memory: 63.7 MB
    */
    public boolean containsDuplicate(int[] nums) {
        if (nums.length == 1) {
            return false;
        }

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