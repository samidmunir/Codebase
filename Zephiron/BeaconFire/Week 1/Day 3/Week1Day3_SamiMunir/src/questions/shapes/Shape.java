package questions.shapes;

public abstract class Shape {
    protected int width;
    protected int height;

    public Shape() {}

    public Shape(int width, int height) {
        this.width = width;
        this.height = height;
    }

    abstract void printArea();
}