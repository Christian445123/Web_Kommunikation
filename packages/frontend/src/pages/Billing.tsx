import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useBillingStore } from "../store/billing.js";

export function Billing() {
  const plan = useBillingStore((s) => s.plan);
  const messageCharLimit = useBillingStore((s) => s.messageCharLimit);
  const subscription = useBillingStore((s) => s.subscription);
  const load = useBillingStore((s) => s.load);
  const startCheckout = useBillingStore((s) => s.startCheckout);
  const cancel = useBillingStore((s) => s.cancel);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const isReturningFromCheckout = searchParams.has("status");

  return (
    <div className="legal-page">
      <button className="icon-button" onClick={() => navigate("/")}>
        ← Zurück
      </button>
      <h1>Nythera Supporter</h1>

      {isReturningFromCheckout && (
        <p style={{ color: "#96989d" }}>
          Danke! Die Zahlungsbestätigung wird per Webhook verarbeitet - dein Plan aktualisiert sich hier automatisch, sobald sie eintrifft.
        </p>
      )}

      <p>
        Aktueller Plan: <strong>{plan === "supporter" ? "Supporter" : "Free"}</strong> — Zeichenlimit pro Nachricht:{" "}
        <strong>{messageCharLimit}</strong>
      </p>
      <p style={{ color: "#96989d" }}>
        Supporter gibt dir <strong>ausschließlich</strong> ein höheres Zeichenlimit pro Nachricht. Keine zusätzlichen Rechte, keine
        serverseitigen Vorteile — auf dem Server selbst verschafft Geld keinen Vorsprung.
      </p>

      {plan === "free" ? (
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button
            className="save-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await startCheckout("stripe");
              } finally {
                setBusy(false);
              }
            }}
          >
            Mit Stripe abonnieren
          </button>
          <button
            className="save-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await startCheckout("paypal");
              } finally {
                setBusy(false);
              }
            }}
          >
            Mit PayPal abonnieren
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          {subscription?.cancelAtPeriodEnd ? (
            <p style={{ color: "#96989d" }}>Dein Abo endet am {subscription.currentPeriodEnd?.slice(0, 10)}.</p>
          ) : (
            <button
              className="save-button"
              style={{ background: "#ed4245" }}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await cancel();
                } finally {
                  setBusy(false);
                }
              }}
            >
              Abo kündigen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
