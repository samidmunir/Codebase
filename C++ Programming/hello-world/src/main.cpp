/*
    Hello World program (C++)
    > hello-world
        > src
            > main.cpp
*/

/*
    Preprocessor Directive

    The C++ preprocessor is a program that processes the source code before the compiler sees it.
    - strips all comments and replaces with a single space
    - executes preprocessor directives (include, if, elif, else, endif, ifdef, ifndef, define, undef, line, error, pragma)
*/
#include <iostream>

/*
    Every C++ program must have exactly 1 main() function.
    - starting point of program execution
    - return 0 indicates successful program execution
    - argc (int) -> # of program arguments
    - argv (**) -> pointer to the vector of program arguments
*/
int main(int argc, char *argv[]) {
    std::cout << "\nHello world!" << std::endl;
    std::cout << "-> Welcome to C++ Programming!" << std::endl;
    std::cout << "------------------------------\n" << std::endl;

    return EXIT_SUCCESS;
}