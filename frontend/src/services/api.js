// frontend/src/services/api.js
//
// Centralized Axios instance for all backend communication. Every
// service/hook in the app should import this instead of calling axios
// directly, so base URL, credentials, and auth-failure handling stay
// consistent in one place.

import axios from "axios";

// Base URL pointing to the live AWS Elastic Beanstalk backend.
// Strips any accidental trailing slashes so paths like /api/* append cleanly.
const rawBaseURL = import.meta.env.VITE_API_URL || "http://Aman-backend-env-1.eba-ufwvg2cy.ap-southeast-2.elasticbeanstalk.com";
const baseURL = rawBaseURL.replace(/\/+$/, "");

const api = axios.create({
  baseURL,
  // The JWT session lives in an HttpOnly cookie (see auth strategy), so
  // every request must carry credentials for the admin shell to work.
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Redirect protected-route requests back to /login on session expiry,
// matching the React Router <ProtectedRoute> behavior described in the TRD.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const isLoginRequest = error?.config?.url?.includes("/auth/login");

    if (status === 401 && !isLoginRequest && typeof window !== "undefined") {
      const onAdminRoute = window.location.pathname.startsWith("/admin");
      if (onAdminRoute) {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
