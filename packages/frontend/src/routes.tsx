import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/auth.js";
import { Login } from "./pages/Login.js";
import { Register } from "./pages/Register.js";
import { AppShell } from "./pages/AppShell.js";

export function AppRoutes() {
  const status = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
    // Runs once on mount - bootstrap identity is stable across the store's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "idle" || status === "loading") {
    return <div className="centered">Lade Nythera…</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={status === "authenticated" ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={status === "authenticated" ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/" element={status === "authenticated" ? <AppShell /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}
