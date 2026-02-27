package questions.employee_streams;

import java.sql.SQLOutput;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public class Stream {
    public static void main(String[] args) {
        List<Employee> employees = new ArrayList<>();
        employees.add(new Employee("Sami", 95000));
        employees.add(new Employee("Landon", 120000));
        employees.add(new Employee("Leo", 75000));
        employees.add(new Employee("John", 65000));
        employees.add( new Employee("Bob", 83000));

        /*
            I) Calculate average salary of employees.
        */
        double averageSalary = employees.stream()
                .mapToInt(Employee::getSalary)
                .average()
                .orElse(0.0);
        System.out.println("\nEmployees average salary: " + averageSalary);

        /*
            II) Get employees with salary > $80,000
        */
        System.out.println("\nEmployees with salary > $80,000:");
        employees.stream()
                .filter(e -> e.getSalary() > 80000)
                .map(Employee::getName)
                .forEach(System.out::println);

        /*
            III) Collect a map of employees storing name and salary (k, v).
        */
        Map<String, Employee> employeeMap = employees.stream()
                .collect(Collectors.toMap(
                        Employee::getName,
                        Function.identity(),
                        (e1, e2) -> e1.getSalary() >= e2.getSalary() ? e1 : e2)
                );
        System.out.println("\nEmployees map: ");
        employeeMap.forEach((k, v) -> System.out.println(k + " -> " + v));

        /*
            IV) Find employees whose name starts with the character X.
        */
        employees.stream()
                .filter(e -> e.getName().startsWith("X"))
                .findAny()
                .map(Employee::getName)
                .ifPresent(System.out::println);

        /*
            V) Concatenating all names of employees togther.
        */
        String employeesNameString = employees.stream()
                .map(Employee::getName)
                .collect(Collectors.joining());
        System.out.println("\nEmployees name string: " + employeesNameString);
    }
}
