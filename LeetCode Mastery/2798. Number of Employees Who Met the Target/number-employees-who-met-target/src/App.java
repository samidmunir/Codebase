public class App {
    public static void main(String[] args) throws Exception {
        System.out.println("\n2798. Number of Employees Who Met the Target");
        /*
         * There are n employees in a company, numbered from 0 to n - 1. Each
         *  employee i has worked for hours[i] in the company.
         * 
         * The company requires each employee to work at least targe hours.
         * 
         * You are given a 0-indexed array of non-negative integers hours of
         *  length n and a non-negative integer target.
         * 
         * Return the integer denoting the number of employees who worked at
         *  least target hours.
         * 
         * Example 1
         *  input: [0, 1, 2, 3, 4], target = 2
         *  output: 3
         * 
         * Example 2
         *  input: [5, 1, 4, 2, 2], target = 6
         *  output: 0
         */
        int[] hours1 = {0, 1, 2, 3, 4};
        int target1 = 2;
        Solution_One solution_one = new Solution_One(hours1, target1);

        int[] hours2 = {5, 1, 4, 2, 2};
        int target2 = 6;
        Solution_One solution_one_b = new Solution_One(hours2, target2);
    }
}
