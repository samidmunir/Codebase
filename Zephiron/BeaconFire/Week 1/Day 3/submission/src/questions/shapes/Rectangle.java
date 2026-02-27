package questions.shapes;

public class Rectangle extends Shape {

    public Rectangle(int width, int height) {
        super(width, height);
    }

    @Override
    public void printArea() {
        float area = (float) (super.width * super.height);

        System.out.println("\nRectangle.printArea() called...");
        System.out.println("The area of Rectangle with width " + super.width + " and height " + super.height + " is " + area);
    }
}