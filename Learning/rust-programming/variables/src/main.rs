/*
    Variables & Mutability in Rust
*/
#![allow(unused_variables)]

const TAX_RATE: f32 = 7.25;

type Meters = i32;

fn main() {
    println!("\nVariables & Mutability in Rust\n");

    /*
        A variable is a name assigned to a value in the program.
        - variables should be named using the snake_case convention.
    */
    let apples_in_basket = 3;
    let oranges_in_basket = 4;
    let fruits_in_basket = apples_in_basket + oranges_in_basket;

    /*
        You can use the println! macro and the "{}" notation to dynamically interpolate variables/values into a String.

        You can also utilize indices within brackets to specifiy which positional argument to embed.
    */
    println!("apples_in_basket = {}", apples_in_basket);
    println!("oranges_in_basket = {oranges_in_basket}");
    println!("fruits_in_basket = {}", fruits_in_basket);
    println!(
        "\nfruits: {0}\n- apples: {1}\n- oranges: {2}",
        fruits_in_basket, apples_in_basket, oranges_in_basket
    );

    /*
        Unused variables (temporary variables) can be precedented with an underscore to tell the compiler to ignore unused var warning.
    */
    let _sample_var = "my unused variable";

    /*
        Variables in Rust are immutable by default.
        - this means that they are incapable of change.

        Use the "mut" keyword to declare a variable as mutable.
        - this allows the value of the variable to be updated/changed (not the data type).
    */
    let mut fav_num = 3;
    fav_num = 7;
    println!("\nfav_num: {}", fav_num);

    /*
        The rustc --explain <ERROR_CODE> will explain a specific Rust error code (from the compiler).
    */

    /*
        Variable shadowing means redeclaraing a variable with the same name (same name, new type & value).
        - the original variable is replaced/invalidated by the new declaration.
    */
    let grams_of_protein = "100.345";
    let grams_of_protein = 100.345;
    let grams_of_protein = 100;

    /*
        A scope is the boundary or region of code where a name is valid.

        Scopes are connected to the idea of blocks.
        - a block is the area between an opening curly brace and a closing curly brace.
        - e.g.: functions, or pair of brackets (nested scope)
    */

    let coffee_price = 4.89;
    // This is an example of nested scope.
    {
        println!("\nThe price of coffee is ${}", coffee_price);
        // This variable will not be accessible outside of this scope (or to the main function).
        let _sample_var = "abcxyz";
    }
    println!("_sample_var: {}", _sample_var);

    /*
        A constant is a name assigned to a value that does not change throughout the life of the program.
        - they are immutable, and hence the mut keyword cannot be used with a constant.
        - variables can only be declared within a function scope, whereas constants can be declared at the class level.
    */
    println!("\nTAX_RATE: {TAX_RATE}");

    /*
        A type alias is an alternate name that we can assign to an existing type.
    */
    let mile_race_length: Meters = 1600;
    println!("\nmile_race_length: {}", mile_race_length);

    /*
        A compiler directive is an annotation that tells the compiler how to parse the source code.
        - lines
        - functions
        - class files
    */
    #[allow(unused_variables)]
    let random = 153;
}
