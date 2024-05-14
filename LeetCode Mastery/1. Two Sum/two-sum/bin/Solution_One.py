# Solution 1
# - double pass
# - O(n^2)
# - runtime: 2017 ms
# - memory: 17.56 MB

from typing import List

class Solution_One:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        n = len(nums)
        for i in range(n):
            complement = target - nums[i]
            for j in range(n):
                if (nums[j] == complement and i != j):
                    return [i, j]

    nums = [2, 7, 11, 15]
    target = 9
    print(twoSum(self = True, nums = nums, target = target))