package com.questions.contains_duplicate;

import java.util.Arrays;

/*
    Runtime: 25ms
    Memory: 76.74MB
*/
public class SolutionOne {
    public boolean containsDuplicate(int[] nums) {
        if (nums.length == 0) {
            return false;
        }
        
        Arrays.sort(nums);

        for (int i = 0; i < nums.length - 1; i++) {
            if (nums[i] == nums[i + 1]) {
                return true;
            }
        }

        return false;
    }
}