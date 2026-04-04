#include <iostream>
// #include <climits>

using namespace std;

int main(int argc, char *argv[]) {
    cout << "\nVariables & Constants in C++\n" << endl;

    /*
        C++ Primitive Data Types
        - fundamental data types implemented directly by the C++ language

        Character
            - char (1 byte or 8 bits)
            - char16_t (2 bytes or 16 bits)
            - char32_t (4 bytes or 32 bits)
            - wchar_t (can represent the largest available character set)
        Integer (whole numbers)
            - short (16 bits)
            - int (16 bits)
            - long (32 bits)
            - long long (64 bits)
            - signed
            - unsigned
        Floating-point
            - float (7 decimal digits)
            - double (15 decimal digits)
            - long double (19 decimal digits)
        Boolean

        Size & precision (often compiler-dependent)
            - #include <climits>
    */

    // C-like initialization
    int num_a = 7;
    cout << "\nnum_a: " << num_a << endl;
    
    // Constructor initialization
    int num_b (7);
    cout << "num_b: " << num_b << endl;

    // C++ list initialization syntax
    int num_c {7};
    cout << "num_c: " << num_c << endl;

    string name = "Sami M";
    cout << "name: " << name << endl;
    cout << "sizeof(name): " << sizeof(name) << " bytes" << endl;

    short age = 25;
    cout << "\nage: " << age << endl;
    cout << "sizeof(age): " << sizeof(age) << " bytes" << endl;

    int favorite_number = 7;
    cout << "\nfavorite_number: " << favorite_number << endl;
    cout << "sizeof(favorite_number): " << sizeof(favorite_number
    ) << " bytes" << endl;

    char dollar_sign = '$';
    cout << "\ndollar_sign: " << dollar_sign << endl;
    cout << "sizeof(dollar_sign): " << sizeof(dollar_sign) << " bytes" << endl;

    float PI = 3.14759;
    cout << "\nPI: " << PI << endl;
    cout << "sizeof(PI): " << sizeof(PI) << " bytes" << endl;

    double TAX_RATE = 1.20485792;
    cout << "\nTAX_RATE: " << TAX_RATE << endl;
    cout << "sizeof(TAX_RATE): " << sizeof(TAX_RATE) << " bytes" << endl;

    return 0;
}