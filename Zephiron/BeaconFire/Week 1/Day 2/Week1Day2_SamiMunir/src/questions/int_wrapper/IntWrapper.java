package questions.int_wrapper;

public final class IntWrapper extends Number implements Comparable<IntWrapper> {
    private final int value;

    public IntWrapper(int value) {
        this.value = value;
    }

    public int get() {
        return value;
    }

    public IntWrapper add(int operand) {
        return new IntWrapper(value + operand);
    }

    public IntWrapper subtract(int operand) {
        return new IntWrapper(value - operand);
    }

    public IntWrapper multiply(int operand) {
        return new IntWrapper(value * operand);
    }

    public IntWrapper divide(int operand) {
        return new IntWrapper(value / operand);
    }

    @Override
    public int intValue() {
        return value;
    }

    @Override
    public long longValue() {
        return (long) value;
    }

    @Override
    public float floatValue() {
        return (float) value;
    }

    @Override
    public double doubleValue() {
        return (double) value;
    }

    @Override
    public int compareTo(IntWrapper other) {
        return Integer.compare(this.value, other.value);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }

        if (!(obj instanceof IntWrapper)) {
            return false;
        }

        IntWrapper other = (IntWrapper) obj;

        return this.value == other.value;
    }

    @Override
    public int hashCode() {
        return Integer.hashCode(value);
    }

    @Override
    public String toString() {
        return String.valueOf(value);
    }
}
