"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => unknown;
    MP_DEVICE_SESSION_ID?: string;
    deviceId?: string;
    __mercadoPagoSdk?: unknown;
  }
}

export function MercadoPagoFrontendSdk() {
  const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;

  useEffect(() => {
    if (document.getElementById("mercado-pago-security")) {
      return;
    }

    const script = document.createElement("script");
    script.id = "mercado-pago-security";
    script.src = "https://www.mercadopago.com/v2/security.js";
    script.async = true;
    script.setAttribute("view", "checkout");
    script.setAttribute("output", "deviceId");
    document.body.appendChild(script);
  }, []);

  function initializeMercadoPago() {
    if (!publicKey || typeof window === "undefined" || !window.MercadoPago || window.__mercadoPagoSdk) {
      return;
    }

    window.__mercadoPagoSdk = new window.MercadoPago(publicKey, { locale: "pt-BR" });
  }

  return (
    <>
      <input id="deviceId" name="deviceId" type="hidden" aria-hidden="true" />
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="afterInteractive"
        onLoad={initializeMercadoPago}
      />
    </>
  );
}
