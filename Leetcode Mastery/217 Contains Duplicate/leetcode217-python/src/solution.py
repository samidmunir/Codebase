class Solution:
    def contains_duplicate(self, nums):
        if len(nums) == 1:
            return False
        
        nums_set = set()

        for num in nums:
            if num in nums_set:
                return True
            else:
                nums_set.add(num)

        return False

def main():
    print('\nLeetcode 217. Contains Duplicate')
    print('------------------------------')

    solution = Solution()

    nums = [1, 2, 3, 1]
    print('\nExample 1 -->')
    print(f' Input: {nums}')
    print(f' Output: {solution.contains_duplicate(nums)}')

    nums = [1, 2, 3, 4]
    print('\nExample 2 -->')
    print(f' Input: {nums}')
    print(f' Output: {solution.contains_duplicate(nums)}')

    nums = [1, 1, 1, 3, 3, 4, 3, 2, 4, 2]
    print('\nExample 3 -->')
    print(f' Input: {nums}')
    print(f' Output: {solution.contains_duplicate(nums)}')

if __name__ == '__main__':
    main()