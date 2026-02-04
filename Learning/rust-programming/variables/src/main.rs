/*
    Variables & Mutability in Rust
*/

fn main() {
    println!("\nVariables & Mutability in Rust");

    /*
        A variable is a name assigned to a value in the program.
        - variables should be named using snake_case.
    */
    let apples_in_basket = 3;
    let oranges_in_basket = 4;
    let fruits_in_basket = apples_in_basket + oranges_in_basket;
    
    println!("apples_in_basket = ", apples_in_basket);
    println!("oranges_in_basket = ", oranges_in_basket);
    println!("fruits_in_basket: {}", fruits_in_basket);
}