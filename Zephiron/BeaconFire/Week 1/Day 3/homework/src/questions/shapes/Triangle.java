package questions.shapes;

public class Triangle extends Shape {

    public Triangle(int width, int height) {
        super(width, height);
    }

    @Override
    public void printArea() {
        float area = (float) (0.5 * super.width * super.height);

        System.out.println("\nTriangle.printArea() called...");
        System.out.println("The area of Triangle with width " + super.width + " and height " + super.height + " is " + area);
    }
}