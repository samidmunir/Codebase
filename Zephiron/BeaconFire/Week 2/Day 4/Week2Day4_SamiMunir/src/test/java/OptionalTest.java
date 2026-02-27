import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

public class OptionalTest {
    @Test
    void shouldThrowNPE() {
        NullPointerException exception = assertThrows(NullPointerException.class, () -> {
            Optional.of(null);
        });

        assertNotNull(exception);
    }

    @Test
    void shouldNotThrowNPE() {
        Optional<Object> optional = Optional.ofNullable(null);

        assertFalse(optional.isPresent());
    }
}