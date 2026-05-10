import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="w-full">
      <main className="flex items-center justify-between px-4 py-2 bg-gray-100">
        <div>
          <h1
            onClick={() => navigate("/")}
            className="text-3xl font-bold uppercase"
          >
            Top Tier Customs
          </h1>
        </div>
        <div>
          <ul className="flex items-center gap-4">
            <li className="text-lg">Catalog</li>
            <li className="text-lg">Services</li>
            <li className="text-lg">About</li>
            <li className="text-lg">Contact</li>
          </ul>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-2 py-1 text-lg font-semibold uppercase border-2 rounded-md">
            Signup
          </button>
          <button
            onClick={() => navigate("/login")}
            className="px-2 py-1 text-lg font-semibold uppercase border-2 border-gray-300 rounded-md"
          >
            Login
          </button>
        </div>
      </main>
    </nav>
  );
};

export default Navbar;
