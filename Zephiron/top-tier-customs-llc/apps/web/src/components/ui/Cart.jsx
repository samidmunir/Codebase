import { useCart } from "../../contexts/Cart";
import { useTheme } from "../../contexts/Theme";
import { ShoppingCart } from "lucide-react";

const Cart = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { cart, toggleCart } = useCart();
  const itemsInCart = 0;

  return (
    <button
      className={`relative p-1 rounded-full cursor-pointer transition-all duration-1000 ${
        isDark ? "text-emerald-500" : "text-green-600"
      }`}
    >
      <ShoppingCart />
      {itemsInCart > 0 && (
        <span
          className={`absolute -top-1 -right-1 bg-rose-500 text-zinc-50 text-xs w-5 h-5 flex items-center justify-center rounded-full`}
        >
          {itemsInCart}
        </span>
      )}
    </button>
  );
};

export default Cart;
