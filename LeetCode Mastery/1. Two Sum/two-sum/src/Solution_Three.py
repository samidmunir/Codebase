# Solution 3
# - single pass HashMap
# - O(n)
# - runtime: 48 ms
# - memory: 17.80 MB

from typing import List

class Solution_Three:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        n = len(nums)
        nums_map = {}
        nums_map[nums[0]] = 0
        for i in range(1, n):
            complement = target - nums[i]
            if complement in nums_map and nums_map[complement] != i:
                return [i, nums_map[complement]]
            else:
                nums_map[nums[i]] = i

    nums = [2, 7, 11, 15]
    target = 9
    print(twoSum(self = True, nums = nums, target = target))