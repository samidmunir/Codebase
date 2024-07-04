from typing import List

class SolutionCharlie:
    # Analysis
    # ________
    # Runtime: 65 ms
    # Memory: 17.74 MB
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        numsMap = {}
        for i in range(len(nums)):
            complement = target - nums[i]
            if complement in numsMap:
                if numsMap[complement] != i:
                    return [i, numsMap[complement]]
            else:
                numsMap[nums[i]] = i
        return None
    
    print('\nSolution Charlie -->')
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

    numsAlphaC = [2, 2]
    targetAlphaC = 4
    print('\nnums[]:', numsAlphaC)
    print('target:', targetAlphaC)
    print('--> output:', twoSum(self = True, nums = numsAlphaC, target = targetAlphaC))