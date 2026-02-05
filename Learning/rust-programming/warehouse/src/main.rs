mod inventory;

mod orders {
    pub const MANAGER: &str = "Razz K.";
}

fn main() {
    println!("\nThe manager of our inventory is {}", inventory::MANAGER);
    println!("\nThe manager of our orders is {}", orders::MANAGER);
}
