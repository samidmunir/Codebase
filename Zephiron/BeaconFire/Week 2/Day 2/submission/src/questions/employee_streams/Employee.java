package questions.employee_streams;

import java.util.Objects;

public class Employee {
    private final String name;
    private final Integer salary;

    public Employee(String name, Integer salary) {
        this.name = Objects.requireNonNull(name, "name");
        this.salary = Objects.requireNonNull(salary, "salary");
    }

    public String getName() {
        return name;
    }

    public Integer getSalary() {
        return salary;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }

        if (!(o instanceof Employee)) {
            return false;
        }

        Employee employee = (Employee) o;

        return Objects.equals(name, employee.name) && Objects.equals(salary, employee.salary);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, salary);
    }

    @Override
    public String toString() {
        return "Employee {" + name + " | " + salary + "}";
    }
}