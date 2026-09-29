import apiClient, { withWake } from "./client";

export async function register(payload) {
  const { data } = await apiClient.post("/auth/register", payload);
  return data;
}

export async function login(payload) {
  const { data } = await apiClient.post("/auth/login", payload);
  return data;
}

export async function updateName(fullName) {
  const { data } = await apiClient.patch("/auth/me", { full_name: fullName });
  return data;
}

export async function fetchMe(attempts = 2) {
  return withWake(async () => {
    const { data } = await apiClient.get("/auth/me");
    return data;
  }, attempts);
}

export async function changePassword(currentPassword, newPassword) {
  const { data } = await apiClient.post("/auth/password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return data;
}

export async function recoverPassword(email, reminder, password) {
  const { data } = await apiClient.post("/auth/recover", { email, reminder, password });
  return data;
}

export async function saveReminder(currentPassword, reminder) {
  const { data } = await apiClient.post("/auth/reminder", {
    current_password: currentPassword,
    reminder,
  });
  return data;
}

export async function forgotPassword(email) {
  const { data } = await apiClient.post("/auth/forgot", { email });
  return data;
}

export async function resetPassword(token, password) {
  const { data } = await apiClient.post("/auth/reset", { token, password });
  return data;
}
