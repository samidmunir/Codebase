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
    Namespace directive to use the std namespace.
    - do not need to specify std namespace each time to use a method from it.
    - namespaces are like containers that allow developers to group together entities under one namespace
    - resolve naming conflicts for entities with the same name
*/
using namespace std;
// using namespace std::cout;
// using namespace std::endl;

/*
    Main function -> entry point of the program.
    - main function must always return an integer
    - argc -> # of arguments to the program
    - argv -> list of passed arguments to the program
*/
int main(int argc, char *argv[]) {
    /*
        "::" - scope resolution opeartor
        "<<" - stream insertion operator
        ">>" - stream extraction operator
    */

    /*
        cout, cin, cerr, and clog are objects that represent streams.
        - standard input/output stream (console/terminal)
    */
    cout << "\nWelcome to C++ Basics\n" << endl;

    string name = "Sami M.";
    cout << "name: " << name << endl;

    int my_fav_number = 7;
    cout << "my_fav_number: " << my_fav_number << endl;

    int user_fav_number;
    cout << "\nNow enter your favorite number: ";
    cin >> user_fav_number;
    cout << "-> User favorite number is: " << user_fav_number << endl;
    
    /*
        Return statement of 0 to indicate successful termination & exit.
    */
    return 0;
}