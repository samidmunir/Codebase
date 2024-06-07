export default function App() {

  async function getAdvice() {
    const res = await fetch("https://api.adviceslip.com/advice");
  }

  return(
    <div>
      <h1>Hello World!</h1>
      <button>Get advice</button>
    </div>
  );
}