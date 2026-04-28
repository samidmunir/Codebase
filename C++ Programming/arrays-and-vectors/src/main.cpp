/*
    Arrays & Vectors program (C++)
    > arrays-and-vectors
        > src
            > main.cpp
*/

#include <iostream>

using namespace std;

int main(int argc, char *argv[]) {
    cout << "\nArrays & Vectors in C++" << endl;
    cout << "-------------------------\n" << endl;

    /*
        A compound data type is made up of other data types.
        - Arrays
        - Multi-dimensional arrays
        - Vectors
    */

    /*
        An array is a compound data type or data structure which stores a collection of elements of the same data type.
        - fixed length
        - direct element access using index location (0..., n - 1)

        Elements are stored contiguously in memory.
        - no checking of out of bounds access in C++ arrays
    */
   int test_scores_a [5]; // integer array of size 5
   
   const int days_in_year {365};
   double hi_temperatures_a [days_in_year]; // double array of size 365

   int test_scores_b [5] {100, 95, 99, 87, 88}; // declaration & initialization

   int high_score_per_level [10] {3, 5}; // initialize 3, 5, and remaining to 0

   double hi_temperatures_b [days_in_year] {0}; // initialize all elements to 0

   int another_array [] {1, 2, 3, 4, 5}; // size automatically computed by compiler

    /*
        Accessing array elements is achieved by using the index location of the element we want to acess within the array.

        array_name [element_index] -> test_scores_b[2] -> 99

        The same syntax is used to modify/change array elements.
    */
    cout << "(before) test_scores_b[2]: " << test_scores_b[2] << endl;

    test_scores_b[2] = 73;
    cout << "(after) test_scores_b[2]: " << test_scores_b[2] << endl;

    /*
        The name of the array represents the location of the first element in the array (index 0).
        - the [index] represents the offset from the beginning of the array.
        - C++ simply performs a calculation to find the correct element.
        - 0 (first) + i (index) * sizeof(element)
    */

    return EXIT_SUCCESS;
}