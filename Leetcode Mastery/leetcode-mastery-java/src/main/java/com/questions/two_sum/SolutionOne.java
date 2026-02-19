package com.questions.two_sum;

import java.util.HashMap;

public class SolutionOne {

    public int[] twoSum(int[] nums, int target) {
        HashMap<Integer, Integer> numsMap = new HashMap<>();

        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];

            if (numsMap.containsKey(complement) && numsMap.get(complement) != i) {
                return new int[]{i, numsMap.get(complement)};
            } else {
                numsMap.put(nums[i], i);
            }
        }

        return null;
    }
}