/*
    Our previous Rust programs all lived in a single main.rs file.

    When we run the cargo new command, we create a new Rust package.
    - a package is a folder with a Cargo.toml file.
        > the Cargo.toml file holds metadata about the package like its name and version.

    A package is a collection of one or more crates.
    - a crate is a collection of Rust code that produces an executable or a library.
    - a crate is the smallest amount of code that the Rust compiler considers at a time.

    Types of Crates
    - Binary Crate
        > a crate that compiles to an executable.
            * a binary crate has a main function that is the entrypoint for the executable.
    - Library Cate
        > exports functionality for other Rust programs to share and use.
            * a library crate does not have a main function and does not compile to be an executable program.

    A module is an organizational container that encapsulates related code.

    A crate root is the base/foundation of a crate (the starting point for the compiler).
*/

fn main() {
}