mod inventory;
mod orders;

use inventory::MANAGER;
use inventory::products::{Item, ProductCategory};

fn main() {
    println!("\nThe manager of our inventory is {}", MANAGER);
    println!("\nThe manager of our orders is {}", orders::MANAGER);

    println!(
        "\nOur managers are {} and {}. We have {} sqft. of floor space.\n",
        inventory::MANAGER,
        orders::MANAGER,
        inventory::FLOOR_SPACE
    );

    inventory::talk_to_manager();

    let favorite_category = ProductCategory::Hammer;
    println!("\nfavorite_category = {favorite_category:?}");

    let tall_ladder = Item {
        name: String::from("Ladder-o-matic 2000"),
        category: favorite_category,
        quantity: 100,
    };
    println!("\ntall_ladder: {:#?}", tall_ladder);
}
