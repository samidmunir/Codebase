import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Highlights from "./Highlights";

const App = () => {
  return (
    <main className="bg-black">
      <Navbar />
      <Hero />
      <Highlights />
    </main>
  );
};

export default App;
