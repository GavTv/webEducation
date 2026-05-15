import { Suspense } from "react";
import OAuthBridgeClient from "./OAuthBridgeClient";

export default function OAuthBridgePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100dvh",
            background: "#0d0d12",
            color: "#9ca3af",
            display: "grid",
            placeItems: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Загрузка…
        </div>
      }
    >
      <OAuthBridgeClient />
    </Suspense>
  );
}
