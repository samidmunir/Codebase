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
    Namespaces are containers to group code entities into namespace scopes.
    - reduces naming conflicts
    - std is the name for the C++ "standard" namespace
    - utilize the scope resolution operator "::"
*/

using namespace std;

/*
    Every C++ program must have exactly 1 main() function.
    - starting point of program execution
    - return 0 indicates successful program execution
    - argc (int) -> # of program arguments
    - argv (**) -> pointer to the vector of program arguments
*/
int main(int argc, char *argv[]) {
    /*
        cout, cin, cerr, clog are objects representing streams.

        cout - standard output stream
            > console/terminal
            > console output
        cin - standard input stream
            > keyboard
            > console input
        << - insertion operator
            > output streams
        >> - extraction operator
            > input streams

        cout and <<
        - insert the data into the cout stream
        - can be chained
        - does not automatically add line breaks

        cin and >>
        - extracts data from the cin stream based on data type
        - can be chained
        - can fail if the entered data cannot be interpreted
    */
    cout << "\nHello world!" << endl;
    cout << "-> Welcome to C++ Programming!" << endl;
    cout << "------------------------------\n" << endl;

    /*
        Same as return 0;
    */
    return EXIT_SUCCESS;
}