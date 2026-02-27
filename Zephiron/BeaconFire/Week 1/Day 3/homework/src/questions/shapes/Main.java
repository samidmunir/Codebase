package questions.shapes;

public class Main {
    public static void main(String[] args) {
        Shape rectangle = new Rectangle(2, 3);
        rectangle.printArea();

        Shape triangle = new Triangle(2, 3);
        triangle.printArea();

        Shape circle = new Circle(3);
        circle.printArea();
    }
}