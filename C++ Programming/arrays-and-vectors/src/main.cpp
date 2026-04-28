/*
    Arrays & Vectors program (C++)
    > arrays-and-vectors
        > src
            > main.cpp
*/

#include <iostream>
#include <vector>

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

    /*
        Multi-dimensional arrays
        - Element_Type array_name [dim1_size][dim2_size]
    */
    const int rows {3};
    const int cols {4};
    int movie_ratings [rows][cols];

    int car_top_speeds [3][3] {
        {110, 124, 129},
        {130, 137, 144},
        {152, 155, 160}
    };
    cout << "\ncar_top_speeds[1][1]: " << car_top_speeds[1][1] << endl;

    /*
        Vectors - a dynamic array/list
            - a container in the C++ Standard Template Library
            - an array that can grow and shrink in size at execution time
            - provides similar semantics & syntax as arrays
            - very efficient
            - provides bound checking
            - utilize functions/methods on the vector object
                > when we create a C++ vector, we are creating a C++ object

        Must include the vector library
        - make use of the standard template namespace

        vector <char> vowels;
        vector <int> test_scores;
    */
    vector <char> vowels_a;
    vector <int> test_scores_c;

    vector <char> vowels_b (5); // automatically sets elements to all ''
    vector <int> test_scores_d (10); // automatically sets elements to all 0

    vector <char> vowels_c {'a', 'e', 'i', 'o', 'u'};
    vector <int> test_scores_e {100, 98, 89, 85, 93};
    vector <double> hi_temperatures_c (365, 80.0); // all 365 elements initialized with value 80.0

    /*
        Vectors Characteristics
        - dynamic size
        - elements of the same type
        - stored contiguously in memory
        - individual elements accessed by position or index
        - [] syntax -> no bounds checking
        - provides many Object methods/functions that do include bounds checking
        - elements are initialized to 0 or default values (if not initialized)
        - very efficient
    */

    return EXIT_SUCCESS;
}