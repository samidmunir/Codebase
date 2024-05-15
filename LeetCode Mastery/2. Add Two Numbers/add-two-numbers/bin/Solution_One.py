# You are given two non-empty linked lists representing two non-negative
#   integers. The digits are stored in reversed order, and each of their
#   nodes contains a single digit. Add the two numbers and return the sum
#   as a linked list.
#
# You may assume the two numbers do not contain any leading zero, except
#   the number 0 itself.

# Definition for singly-linked list.
from typing import Optional

class ListNode:
  def __init__(self, val = 0, next = None):
      self.val = val
      self.next = next

# Solution 1
# - double pointer (single-pass)
# - O(n)
# - runtime: 41 ms
# - memory: 11.63 MB
class Solution_One:
    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:
        dummy = ListNode()
        curr = dummy
        carry = 0
        while l1 or l2 or carry:
            v1 = l1.val if l1 else 0
            v2 = l2.val if l2 else 0
            val = v1 + v2 + carry
            carry = val / 10
            digit = val % 10
            curr.next = ListNode(digit)
            curr = curr.next
            l1 = l1.next if l1 else None
            l2 = l2.next if l2 else None
        return dummy.next