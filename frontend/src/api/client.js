import axios from "axios";

const client = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// JWT interceptor
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("novatrade_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("novatrade_token");
      localStorage.removeItem("novatrade_user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default client;
