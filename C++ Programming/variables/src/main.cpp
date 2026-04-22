/*
    Variables program (C++)
    > variables
        > src
            > main.cpp
*/

#include <iostream>

using namespace std;

/*
    Variables are an abstraction for memory locations.
    - allow programmers to use meaningful names and not memory addresses
    - variables have a type, name, and value.
    - must be declared before they are used
    - a variable's value may change throughout the execution of the program

    Variable Naming Rules
    - can contain letters, numbers, and underscores.
    - must begin with a letter or underscore (_)
    - cannot use C++ reserved keywords as variable names
    - cannot redeclare a name in the same scope
        > C++ is case sensitive
*/

int main(int argc, char *argv[]) {
    cout << "\nVariables in C++" << endl;
    cout << "--------------------\n" << endl;

    int temp_num_1; // uninitialized
    cout << "temp_num_1 (uninitialized): " << temp_num_1 << endl;
    temp_num_1 = 101; // C-like initialization
    cout << "temp_num_1 (C-like init): " << temp_num_1 << endl;
    int temp_num_2 (102); // constructor initialization
    cout << "temp_num_2 (constructor init): " << temp_num_2 << endl;
    int temp_num_3 {103}; // C++11 list initialization syntax
    cout << "temp_num_3 (uninitialized): " << temp_num_3 << endl;

    return EXIT_SUCCESS;
}