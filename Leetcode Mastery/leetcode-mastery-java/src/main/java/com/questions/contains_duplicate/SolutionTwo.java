package com.questions.contains_duplicate;

import java.util.HashSet;

/*
    Runtime: 14ms
    Memory: 93.63MB
*/
public class SolutionTwo {
    public boolean containsDuplicate(int[] nums) {
        if (nums.length == 0) {
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