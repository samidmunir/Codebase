/*
    Structure of a C++ Program
*/

/*
    Pre-processor include directive
    - the pre-processor is a program that processes the source code before the compiler sees it.
    - it strips all comments
    - searches & executes all pre-processor directives
    - the include directive is replaced with the file it is referencing.
*/
#include <iostream>

/*
    Main function -> entry point of the program.
*/
int main(void) {
    /*
        "::" - scope resolution opeartor
        "<<" - stream insertion operator
        ">>" - stream extraction operator
    */
    std::cout << "Welcome to C++ Basics" << std::endl;
    
    /*
        Return statement of 0 to indicate successful termination & exit.
    */
    return 0;
}