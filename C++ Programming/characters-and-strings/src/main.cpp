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
#include <string>

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
    char my_char = 'S';
    cout << "my_char: " << my_char << endl;
    cout << "isalpha(my_char): " << isalpha(my_char) << endl;
    cout << "isalnum(my_char): " << isalnum(my_char) << endl;
    cout << "isdigit(my_char): " << isdigit(my_char) << endl;
    cout << "islower(my_char): " << islower(my_char) << endl;
    cout << "isprint(my_char): " << isprint(my_char) << endl;
    cout << "ispunct(my_char): " << ispunct(my_char) << endl;
    cout << "isupper(my_char): " << isupper(my_char) << endl;
    cout << "isspace(my_char): " << isspace(my_char) << endl;

    cout << "\ntolower(my_char): " << (char) tolower(my_char) << endl;
    cout << "toupper(my_char): " << (char) toupper(my_char) << endl;

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
   cout << "\nmy_name: " << my_name << endl;

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

        Requires null-terminated C-style strings.
   */

   char full_name[50];
   cout << "\nfull_name: " << full_name << endl;
   cout << "strlen(full_name): " << strlen(full_name) << endl;
   strcpy(full_name, "John");
   cout << "full_name: " << full_name << endl;
   cout << "strlen(full_name): " << strlen(full_name) << endl;
   strcat(full_name, " ");
   cout << "full_name: " << full_name << endl;
   cout << "strlen(full_name): " << strlen(full_name) << endl;
   strcat(full_name, "Doe");
   cout << "full_name: " << full_name << endl;
   cout << "strlen(full_name): " << strlen(full_name) << endl;
   cout << "strcmp(full_name, 'Another'): " << strcmp(full_name, "Another") << endl;

   /*
        The <cstdlib> includes functions to convert C-style Strings to integers, floats, longs, etc.
   */

   /*
        C-style String Examples
   */
   char first_name_a[20] {};
   char last_name_a[20] {};
   char full_name_a[50] {};
   char temp[50] {};

   // cout << "\nfirst_name_a: " << first_name_a << endl;
   cout << "\nPlease enter your first name: ";
   cin >> first_name_a;
   cout << "You entered: " << first_name_a << endl;

   cout << "\nPlease enter your last name: ";
   cin >> last_name_a;
   cout << "You entered: " << last_name_a << endl;

   strcpy(full_name_a, first_name_a);
   strcat(full_name_a, " ");
   strcat(full_name_a, last_name_a);
   cout << "\nYour full name is " << full_name_a << endl;
   /*
        strlen -> returns size_t
   */
   cout << "Your full name has " << strlen(full_name_a) << " characters" << endl;

   // ---------------------------------------------------------------------------------

   /*
        C++ Strings
        - #include <string>
        - std namespace
        - contiguous in memory
        - dynamic size
        - work with input/output streams
        - lots of useful member functions
        - can easily be converted to C-style Strings if needed
        - safer
   */
   cout << "\nC++ Strings\n" << endl;

   string s1; // empty
   string s2 {"Sami"}; // Frank
   string s3 {s2}; // Frank
   string s4 {"Frank", 3}; // Fra
   string s5 {s3, 0, 2}; // Fr
   string s6 (3, 'X'); // XXX

   s1 = "C++ Rocks!";
   string s7 {"Hello"};
   s7 = s1;

   /*
        String Concatenation
   */
    string part1 {"C++"};
    string part2 {"is a powerful"};
    string sentence;
    sentence = part1 + " " + part2 + " language.";

    cout << sentence[0] << endl;
    cout << sentence.at(2) << endl;

    return EXIT_SUCCESS;
}