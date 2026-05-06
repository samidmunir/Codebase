/*
    Characters & Strings (C++)
    > characters-and-strings
        > src
            > main.cpp
*/

#include <iostream>
#include <cctype> // for character-based functions
#include <cstring> // for C-style string functions
#include <cstdlib>

using namespace std;

int main(int argc, char *argv[]) {
    cout << "\nCharacters & Strings in C++" << endl;
    cout << "------------------------------\n" << endl;

    /*
        C++ supports both C-style strings as well as C++ style strings.
    */

    /*
        The <cctype> library includes functions for testing characters and converting character's case.
        - isalpha(c): True if c is a letter
        - isalnum(c): True if c is a letter or digit
        - isdigit(c): True if c is a digit
        - islower(c): True if c is a lowercase letter
        - isprint(c): True if c is a printable character
        - ispunct(c): True if c is a punctuation character
        - isupper(c): True if c is an uppercase letter
        - isspace(c): True if c is whitespace

        - tolower(c): Returns lowercase of c
        - toupper(c): Returns uppercase of c
    */

    /*
        C-style Strings
        - sequence of characters
            > contiguous in memory
            > implemented as an array of characters
            > terminated by a null character
            > referred to as a zero or null terminated string
        - string literal
            > sequence of characters in double quotes ""
            > constant
            > terminated with the null character (automatically added by the C++ compiler)
    */
   char my_name[] {"Sami"};
   cout << "my_name: " << my_name << endl;

   char long_name[25] {"Rahameen"}; // remaining characters will be null characters
   cout << "\nlong_name: " << long_name << endl;
   long_name[8] = ' ';
   long_name[9] = 'K';
   long_name[10] = 'h';
   long_name[11] = 'a';
   long_name[12] = 'n';
   cout << "long_name: " << long_name << endl;

   /*
        The <cstring> library includes functions that work with C-style strings.
        - copying
        - concatenation
        - comparison
        - searching
        - etc.
   */

   char full_name[15];
   cout << "\nfull_name: " << full_name << endl;
   strcpy(full_name, "Sami");
   cout << "full_name: " << full_name << endl;
   strcat(full_name, " Munir");
   cout << "full_name: " << full_name << endl;
   cout << "strlen(full_name): " << strlen(full_name) << endl;

   /*
        The <cstdlib> includes functions to convert C-style Strings to integers, flaots, longs, etc.
   */

    return EXIT_SUCCESS;
}