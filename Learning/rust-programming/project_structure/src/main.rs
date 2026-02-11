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

    1. in-file mod declaration
    2. external file mod declaration (.rs extension within src folder)
    3. external folder mod with mod.rs file

    You cannot have two Rust modules with the same name (orders.rs vs. orders folder w/ mod.rs)...

    You can create modules within other modules. These are called submodules.
    
    A submodule is a module that exists within another (parent) module.
    - in-line
    - file.rs
    - folder/mod.rs

    An absolute path is the full, complete path to a name starting from the crate root.

    A relative path is the path to a name starting from the current location/module.

    The "use" keyword brings a name into the current scope. It creates a "shortcut" to a name in a nested module.

    The self keyword refers to the after-mentioned module; whatever is the last module before the scope-resolution operator.

    The super keyword comes into play when a child module wants to refer to something public within the parent module
    - hierarchical relation
*/

fn main() {
}