#include <iostream>

using namespace std;

int main(int argc, char *argv[]) {
    cout << "\nVariables & Constants in C++\n" << endl;

    // C-like initialization
    int num_a = 7;
    cout << "\nnum_a: " << num_a << endl;
    cout << num_a << endl;
    
    // Constructor initialization
    int num_b (7);
    cout << "num_b: " << num_b << endl;

    // C++ list initialization syntax
    int num_c {7};
    cout << "num_c: " << num_c << endl;

    string name = "Sami M";
    cout << "name: " << name << endl;

    short age = 25;
    cout << "age: " << age << endl;

    int favorite_number = 7;
    cout << "favorite_number: " << favorite_number << endl;

    char dollar_sign = '$';
    cout << "dollar_sign: " << dollar_sign << endl;

    float PI = 3.14759;
    cout << "PI: " << PI << endl;

    double TAX_RATE = 1.20485792;
    cout << "TAX_RATE: " << TAX_RATE << endl;

    return 0;
}