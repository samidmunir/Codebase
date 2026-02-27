package questions.my_exception;

public class Main {
    public static void main(String[] args) {
        try {
            System.out.println(divide(10, 2));
            System.out.println(divide(7, 2));
        } catch (NonIntResultException e) {
            System.out.println(e.getMessage());
        }
    }

    private static int divide(int a, int b) {
        if (b == 0) {
            throw new ArithmeticException("Division by zero error.");
        }

        if (a % b != 0) {
            throw new NonIntResultException(a, b);
        }

        return a / b;
    }
}