package questions.my_exception;

public class NonIntResultException extends RuntimeException {
    private final int dividend;
    private final int divisor;

    public NonIntResultException(int dividend, int divisor) {
        super(dividend + " divided by " + divisor + " is not an integer.");
        this.dividend = dividend;
        this.divisor = divisor;
    }

    public int getDividend() {
        return dividend;
    }

    public int getDivisor() {
        return divisor;
    }
}
