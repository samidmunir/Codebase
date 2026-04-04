#include <iostream>
#include <vector>

using namespace std;

int main(int argc, char *argv[]) {
    cout << "\nArrays & Vectors in C++\n" << endl;

    /*
        Arrays
        - fixed size
        - elements are all the same type
        - stored contiguously in memory
        - elements accessed by their position or index
        - *** no checking for out of bounds ***
        - always initialize the array
        - very efficient
    */

    // create a new array test_scores (int) with size 5
    int test_scores [5];

    const int days_in_year = 365;
    double hi_temperatures [days_in_year];

    int nums [3] {2, 11, 56};

    // initialize an array with all 0's
    int all_zeros [] {0};

    // array size will be automatically calculated
    int auto_size [] {1, 12, 23, 34, 45, 56, 67};

    vector <char> vowels {'a', 'e', 'i', 'o', 'u'};

    vector <int> int_vector {100, 98, 89, 85, 93};

    vector <double> hi_temps (365, 80.0);

    return 0;
}