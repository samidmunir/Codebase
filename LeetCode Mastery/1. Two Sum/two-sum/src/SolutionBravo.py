from typing import List

class SolutionAlpha:
    # Analysis
    # ________
    # Runtime: 62 ms
    # Memory: 17.72 MB
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        numsMap = {}
        for i in range(len(nums)):
            numsMap[nums[i]] = i
        for i in range(len(nums)):
            complement = target - nums[i]
            if complement in numsMap and numsMap[complement] != i:
                return [i, numsMap[complement]]
        return None
    
    print('\nSolution Bravo -->')
    numsAlpha = [2, 7, 11, 15]
    targetAlpha = 9
    print('nums[]:', numsAlpha)
    print('target:', targetAlpha)
    print('--> output:', twoSum(self = True, nums = numsAlpha, target = targetAlpha))

    numsAlphaB = [3, 2, 4]
    targetAlphaB = 6
    print('\nnums[]:', numsAlphaB)
    print('target:', targetAlphaB)
    print('--> output:', twoSum(self = True, nums = numsAlphaB, target = targetAlphaB))