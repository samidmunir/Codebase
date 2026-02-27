import org.junit.jupiter.api.Test;

import java.util.Stack;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class StackTest {
    @Test
    void stackShouldFollowLIFO() {
        Stack<Integer> stack = new Stack<>();

        // push() some elements
        stack.push(2);
        stack.push(56);
        stack.push(0);
        stack.push(89);
        stack.push(14);

        // ensure LIFO order on pop()
        assertEquals(14, stack.pop());
        assertEquals(89, stack.pop());
        assertEquals(0, stack.pop());

        // ensure if peek() works
        assertEquals(56, stack.peek());

        stack.pop();
        stack.pop();

        // ensure stack is empty
        assertTrue(stack.isEmpty());

    }
}