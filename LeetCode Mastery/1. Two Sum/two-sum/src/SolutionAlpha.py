from typing import List

class SolutionAlpha:
    # Analysis
    # ________
    # Runtime: 958 ms
    # Memory: 17.42 MB
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        for i in range(len(nums)):
            complement = target - nums[i]
            for j in range((i + 1), len(nums)):
                if nums[j] == complement:
                    return [i, j]
        return None
    
    print('\nSolution Alpha -->')
    numsAlpha = [2, 7, 11, 15]
    targetAlpha = 9
    print('nums[]:', numsAlpha)
    print('target:', targetAlpha)
    print('--> output:', twoSum(self = True, nums = numsAlpha, target = targetAlpha))

    numsAlphaB = [3, 2, 4]
    targetAlphaB = 6
    print('\nnums[]:', numsAlpha)
    print('target:', targetAlpha)
    print('--> output:', twoSum(self = True, nums = numsAlphaB, target = targetAlphaB))