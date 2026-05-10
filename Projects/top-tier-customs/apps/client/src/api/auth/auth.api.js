const API_BASE_URL = "http://localhost:8080/api/auth";

export const signupAPI = async (formData) => {
  const response = await fetch(`${API_BASE_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(formData),
  });

  if (!response.ok) {
    throw new Error("Signup failed");
  }

  return response.json();
};

export const meAPI = async () => {
  const response = await fetch(`${API_BASE_URL}/me`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Not authenticated");
  }

  return response.json();
};

export const logoutAPI = async () => {
  await fetch(`${API_BASE_URL}/logout`, {
    method: "POST",
    credentials: "include",
  });
};
