import { ApiStatus } from "../components/common/ApiStatus";

import { login } from "../features/auth";

async function testLogin() {
  try {
    const response = await login({
      email: "samidmunir@outlook.com",
      password: "SINEcos8tan",
    });

    console.log("Atlas login:", response);
  } catch (error) {
    console.error("Atlas login failed:", error);
  }
}

export function HomePage() {
  return (
    <main>
      <h1>Atlas</h1>
      <p>Your personal operating system.</p>

      <ApiStatus />

      <button onClick={testLogin}>Test Atlas Login</button>
    </main>
  );
}
