import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

/*
    subList() does not create a new independent list.
    It returns a view backed by the original list.
    - changes affect both (original & view).
    - modifying an element has an effect on both.
    - they share the same underlying data.

    Test case to prove subList() is a shallow copy:
    1) Modifying the subList modifies the original list.
    2) They should share the same object reference.
*/
public class SubListTest {
    @Test
    void subListIsShallowCopy() {
        List<Person> original = new ArrayList<>();
        original.add(new Person("Sami"));
        original.add(new Person("Landon"));
        original.add(new Person("Leo"));

        // create a sublist from original
        List<Person> subList = original.subList(0, 2);

        // modify the object inside subList
        subList.get(1).name = "Updated Landon";

        // since it's a shallow copy, original should also reflect the change.
        assertEquals("Updated Landon", original.get(1).name);

        // verify same object reference
        assertSame(original.get(1), subList.get(1));
    }
}