public class SolutionAlpha {
    /*
     * public class ListNode {
     *  int val;
     *  ListNode next;
     *  
     *  ListNode() {}
     * 
     *  ListNode(int val) {
     *      this.val = val;
     *  }
     * 
     *  ListNode(int val, ListNode next) {
     *      this.val = val;
     *      this.next = next;
     *  }
     * }
     */
    public static ListNode addTwoNumbers(ListNode l1, ListNode l2) {
        ListNode temp = new ListNode(0, null);
        ListNode current = temp;
        int carry = 0;

        while (l1 != null || l2 != null || carry > 0) {
            int val1 = 0;
            if (l1 != null) {
                val1 = l1.val;
            } else {
                val1 = 0;
            }
            int val2 = 0;
            if (l2 != null) {
                val2 = l2.val;
            } else {
                val2 = 0;
            }
            int sum = val1 + val2 + carry;
            carry = sum / 10;
            int digit = sum % 10;
            current.next = new ListNode(digit);
            current = current.next;
            if (l1 != null) {
                l1 = l1.next;
            } else {
                l1 = null;
            }
            if (l2 != null) {
                l2 = l2.next;
            } else {
                l2 = null;
            }
        }
        
        return temp.next;
    }
}