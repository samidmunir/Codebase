# Solution 2
# - double pass HashMap
# - O(n^2) but better access time
# - runtime: 58 ms
# - memory: 17.69 MB

from typing import List

class Solution_Two:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        n = len(nums)
        nums_map = {}
        for i in range(n):
            nums_map[nums[i]] = i
        for i in range(n):
            complement = target - nums[i]
            if complement in nums_map and nums_map[complement] != i:
                return [i, nums_map[complement]]

    nums = [2, 7, 11, 15]
    target = 9
    print(twoSum(self = True, nums = nums, target = target))