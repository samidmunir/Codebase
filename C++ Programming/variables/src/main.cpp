/*
    Variables program (C++)
    > variables
        > src
            > main.cpp
*/

#include <iostream>

using namespace std;

/*
    Global variables can be accessed anywhere in the program.
    - uninitialized global variables are taken care of by the C++ compiler automatically with a default value.
*/
string my_global_var = "my_global_var_string"; // global variable

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

    /*
        Local variables - local to the main() function
    */
    int temp_num_1; // uninitialized
    cout << "temp_num_1 (uninitialized): " << temp_num_1 << endl;
    temp_num_1 = 101; // C-like initialization
    cout << "temp_num_1 (C-like init): " << temp_num_1 << endl;
    int temp_num_2 (102); // constructor initialization
    cout << "temp_num_2 (constructor init): " << temp_num_2 << endl;
    int temp_num_3 {103}; // C++11 list initialization syntax
    cout << "temp_num_3 (uninitialized): " << temp_num_3 << endl;

    /*
        C++ Primitive Data Types
        - the fundamental data types implemented directly by the C++ language
            > Character types
            > Integer types
                - signed
                - unsigned
            > Floating-point types
            > Boolean types
            > Size & precision is often compiler-dependent
                - #include <climits>
        
        Type Sizes
        - expressed in bits
        - the more bits, the more values that can be represented
            > 2^n (# of bits)
        - the more bits, the more storage required

        8 bits (1 byte) - 256 values
        16 bits (2 bytes) - 65,536 values
        32 bits (4 bytes) - 4,294,967,296 values
        64 bits (8 bytes) - 18,446,744,073,709,551,615 values
    */
    /*
        Character Types
        - used to represent single characters
        - wider types are used to represent wide character sets

        char - 8 bits (1 byte)
        char16_t - 16 bits (2 bytes)
        char32_t - 32 bits (4 bytes)
        wchar_t - can represent the largest available character set
    */
    char my_middle_initial = 'D';
    cout << "\nmy_middle_initial: " << my_middle_initial << endl;
    
    /*
        Integer Types
        - used to represent whole numbers
        - signed & unsigned versions

        signed short int - 16 bits (2 bytes)
        signed int - 16 bits (2 bytes)
        signed long int - 32 bits (4 bytes)
        signed long long int - 64 bits (8 bytes)

        unsigned short int - 16 bits (2 bytes)
        unsigned int - 16 bits (2 bytes)
        unsigned long int - 32 bits (4 bytes)
        unsigned long long int - 64 bits (8 bytes)
    */
    int my_age {25};
    cout << "my_age: " << my_age << endl;
    long people_on_earth {7'600'000'000};
    cout << "people_on_earth: " << people_on_earth << endl;
    
    /*
        Floating-point Types
        - used to represent non-integer numbers
        - represented by mantissa and exponent (scientific notation)
        - precision is the number of digits in the mantissa
        - precision and size are compiler dependent

        float - 7 decimal digits
        double - 15 decimal digits
        long double - 19 decimal digits
    */
    float tax_rate = 1.425;
    cout << "tax_rate: " << tax_rate << endl;
    double pi = 3.14159;
    cout << "pi: " << pi << endl;

    /*
        Boolean Type
        - used to represent true and false
        - zero value is false
        - non-zero value is true
        - can also use true or false C++ keywords as values
    */
    bool old_enough_to_drive = true;
    cout << "old_enough_to_drive: " << old_enough_to_drive << endl;

    return EXIT_SUCCESS;
}