package questions.shapes;

public class Circle extends Shape {

    public Circle(int radius) {
        super(radius, 0);
    }

    @Override
    public void printArea() {
        float area = (float) (Math.PI * super.width);

        System.out.println("\nCircle.printArea() called...");
        System.out.println("The area of Circle with width (radius) " + super.width + " is " + area);
    }
}