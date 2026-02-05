mod inventory {
    const FLOOR_SPACE: i32 = 10000;
    pub const MANAGER: &str = "Sami M.";

    #[derive(Debug)]
    enum ProductCategory {
        Ladder,
        Hammer,
    }

    #[derive(Debug)]
    struct Item {
        name: String,
        category: ProductCategory,
        quantity: u32,
    }

    fn talk_to_manager() {
        println!("Hey, {}, how's your coffee?", { MANAGER });
    }
}

mod orders {
    pub const MANAGER: &str = "Razz K.";
}

fn main() {
    println!("\nThe manager of our inventory is {}", inventory::MANAGER);
    println!("\nThe manager of our orders is {}", orders::MANAGER);
}
