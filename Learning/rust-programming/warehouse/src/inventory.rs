pub const FLOOR_SPACE: i32 = 10000;
pub const MANAGER: &str = "Sami M.";

pub fn talk_to_manager() {
    println!("Hey, {}, how's your coffee?", { crate::inventory::MANAGER });
}

pub mod products;
