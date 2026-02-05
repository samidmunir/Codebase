mod inventory;

mod orders;

fn main() {
    println!("\nThe manager of our inventory is {}", inventory::MANAGER);
    println!("\nThe manager of our orders is {}", orders::MANAGER);
}
