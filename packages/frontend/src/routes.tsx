import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/auth.js";
import { Login } from "./pages/Login.js";
import { Register } from "./pages/Register.js";
import { AppShell } from "./pages/AppShell.js";
import { PrivacyPolicy } from "./pages/PrivacyPolicy.js";
import { TermsOfService } from "./pages/TermsOfService.js";
import { DeveloperPortal } from "./pages/developer/DeveloperPortal.js";
import { ApplicationDetail } from "./pages/developer/ApplicationDetail.js";
import { BotInvite } from "./pages/BotInvite.js";
import { Billing } from "./pages/Billing.js";

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
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/developer" element={status === "authenticated" ? <DeveloperPortal /> : <Navigate to="/login" replace />} />
      <Route path="/developer/:id" element={status === "authenticated" ? <ApplicationDetail /> : <Navigate to="/login" replace />} />
      <Route path="/bot-invite/:applicationId" element={status === "authenticated" ? <BotInvite /> : <Navigate to="/login" replace />} />
      <Route path="/billing" element={status === "authenticated" ? <Billing /> : <Navigate to="/login" replace />} />
      <Route path="/billing/success" element={status === "authenticated" ? <Billing /> : <Navigate to="/login" replace />} />
      <Route path="/" element={status === "authenticated" ? <AppShell /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}
