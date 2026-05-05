"use client";

import { CheckCircle2, Copy, FileDown, Loader2, QrCode } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { downloadDeckPdf } from "@/services/pdf-generator.service";
import type { DeckCard } from "@/types/deck.types";

interface GeneratePdfButtonProps {
  cards: DeckCard[];
  onError: (message: string) => void;
}

interface PixPayment {
  id: number;
  status: string;
  statusDetail: string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string;
}

function readMercadoPagoDeviceId(): string | undefined {
  const input = document.getElementById("deviceId") as HTMLInputElement | null;
  const deviceId = window.deviceId || window.MP_DEVICE_SESSION_ID || input?.value;
  return deviceId?.trim() || undefined;
}

async function waitForMercadoPagoDeviceId(): Promise<string | undefined> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const deviceId = readMercadoPagoDeviceId();
    if (deviceId) return deviceId;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }

  return undefined;
}

export function GeneratePdfButton({ cards, onError }: GeneratePdfButtonProps) {
  const deckSignature = useMemo(
    () => cards.map((card) => `${card.deckType}:${card.instanceId}:${card.id}`).join("|"),
    [cards],
  );
  const previousDeckSignature = useRef(deckSignature);
  const [isOpen, setIsOpen] = useState(false);
  const [isGeneratingFree, setIsGeneratingFree] = useState(false);
  const [isGeneratingFullHd, setIsGeneratingFullHd] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [payerEmail, setPayerEmail] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payment, setPayment] = useState<PixPayment | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");

  useEffect(() => {
    if (previousDeckSignature.current === deckSignature) {
      return;
    }

    previousDeckSignature.current = deckSignature;

    if (payment) {
      setPayment(null);
      setIsCheckingPayment(false);
      setPaymentMessage("Deck alterado. Gere um novo Pix para baixar em FULL HD.");
    }
  }, [deckSignature, payment]);

  async function handleDownloadFree() {
    setIsGeneratingFree(true);
    onError("");

    try {
      await downloadDeckPdf(cards, "free");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Falha ao gerar PDF.");
    } finally {
      setIsGeneratingFree(false);
    }
  }

  async function handleCreatePix() {
    const email = payerEmail.trim();
    if (!email) {
      onError("Informe o e-mail para gerar o Pix.");
      return;
    }

    setIsGeneratingFullHd(true);
    setPaymentMessage("");
    onError("");

    try {
      const [firstName, ...lastNameParts] = payerName.trim().split(/\s+/).filter(Boolean);
      const deviceId = await waitForMercadoPagoDeviceId();
      const response = await fetch("/api/mercado-pago/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName,
          lastName: lastNameParts.join(" "),
          deviceId,
        }),
      });
      const payload = (await response.json()) as { payment?: PixPayment; error?: string };

      if (!response.ok || !payload.payment) {
        throw new Error(payload.error ?? "Falha ao gerar Pix.");
      }

      setPayment(payload.payment);
      setPaymentMessage("Pix gerado.");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Falha ao gerar Pix.");
    } finally {
      setIsGeneratingFullHd(false);
    }
  }

  async function handleCheckPayment() {
    if (!payment) return;

    setIsCheckingPayment(true);
    setPaymentMessage("");
    onError("");

    try {
      const response = await fetch(`/api/mercado-pago/payments/${payment.id}`);
      const payload = (await response.json()) as {
        payment?: { status: string; statusDetail: string };
        error?: string;
      };

      if (!response.ok || !payload.payment) {
        throw new Error(payload.error ?? "Falha ao verificar pagamento.");
      }

      setPayment((current) => current
        ? { ...current, status: payload.payment?.status ?? current.status, statusDetail: payload.payment?.statusDetail ?? current.statusDetail }
        : current);

      setPaymentMessage(payload.payment.status === "approved" ? "Pagamento aprovado." : "Aguardando pagamento.");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Falha ao verificar pagamento.");
    } finally {
      setIsCheckingPayment(false);
    }
  }

  useEffect(() => {
    if (!payment || payment.status === "approved") {
      return;
    }

    let isCancelled = false;
    const paymentId = payment.id;

    async function checkPaymentStatus() {
      try {
        const response = await fetch(`/api/mercado-pago/payments/${paymentId}`);
        const payload = (await response.json()) as {
          payment?: { status: string; statusDetail: string };
          error?: string;
        };

        if (!response.ok || !payload.payment || isCancelled) {
          return;
        }

        setPayment((current) => {
          if (!current || !payload.payment) return current;
          if (current.status === payload.payment.status && current.statusDetail === payload.payment.statusDetail) {
            return current;
          }

          return {
            ...current,
            status: payload.payment.status,
            statusDetail: payload.payment.statusDetail,
          };
        });

        if (payload.payment.status === "approved") {
          setPaymentMessage("Pagamento confirmado. FULL HD liberado.");
        } else if (!paymentMessage) {
          setPaymentMessage("Aguardando pagamento.");
        }
      } catch {
        // The manual verify button remains available if a background check fails.
      }
    }

    void checkPaymentStatus();
    const timer = window.setInterval(checkPaymentStatus, 5000);

    return () => {
      isCancelled = true;
      window.clearInterval(timer);
    };
  }, [payment?.id, payment?.status, paymentMessage]);

  async function handleDownloadFullHd() {
    setIsGeneratingFullHd(true);
    onError("");

    try {
      await downloadDeckPdf(cards, "full-hd");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Falha ao gerar PDF FULL HD.");
    } finally {
      setIsGeneratingFullHd(false);
    }
  }

  async function handleCopyPix() {
    if (!payment?.qrCode) return;
    await navigator.clipboard.writeText(payment.qrCode);
    setPaymentMessage("Pix copiado.");
  }

  const hasCards = cards.length > 0;
  const isPaymentApproved = payment?.status === "approved";

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={!hasCards}
        className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-red-800 px-5 py-4 text-base font-black text-white shadow-card transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        <FileDown size={21} />
        Gerar PDF
      </button>

      {isOpen ? (
        <div className="grid gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-card">
          <button
            type="button"
            onClick={handleDownloadFree}
            disabled={!hasCards || isGeneratingFree}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-stone-300 bg-stone-50 px-4 text-sm font-black text-stone-950 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGeneratingFree ? <Loader2 className="animate-spin" size={18} /> : <FileDown size={18} />}
            Baixar gratis com qualidade inferior
          </button>

          <div className="grid gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
            <p className="text-sm font-black text-stone-950">FULL HD para impressao</p>
            <p className="text-xs font-bold text-emerald-800">R$ 4,99</p>
              </div>
              {isPaymentApproved ? <CheckCircle2 className="text-emerald-800" size={22} /> : <QrCode className="text-emerald-800" size={22} />}
            </div>

            {!payment ? (
              <div className="grid gap-2">
                <input
                  value={payerName}
                  onChange={(event) => setPayerName(event.target.value)}
                  placeholder="Nome"
                  className="min-h-11 rounded-lg border border-emerald-200 bg-white px-3 text-sm font-bold text-stone-950 outline-none focus:border-emerald-800"
                />
                <input
                  value={payerEmail}
                  onChange={(event) => setPayerEmail(event.target.value)}
                  type="email"
                  placeholder="E-mail"
                  className="min-h-11 rounded-lg border border-emerald-200 bg-white px-3 text-sm font-bold text-stone-950 outline-none focus:border-emerald-800"
                />
                <button
                  type="button"
                  onClick={handleCreatePix}
                  disabled={!hasCards || isGeneratingFullHd}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-black text-white active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-400"
                >
                  {isGeneratingFullHd ? <Loader2 className="animate-spin" size={18} /> : <QrCode size={18} />}
                  Gerar Pix
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="rounded-lg bg-white p-2">
                  <img
                    src={`data:image/jpeg;base64,${payment.qrCodeBase64}`}
                    alt="QR Code Pix"
                    className="mx-auto h-52 w-52"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 text-sm font-black text-emerald-900"
                >
                  <Copy size={17} />
                  Copiar Pix
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCheckPayment}
                    disabled={isCheckingPayment}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 text-sm font-black text-emerald-900 disabled:opacity-60"
                  >
                    {isCheckingPayment ? <Loader2 className="animate-spin" size={17} /> : null}
                    Verificar
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadFullHd}
                    disabled={!isPaymentApproved || isGeneratingFullHd}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-stone-400"
                  >
                    Baixar FULL HD
                  </button>
                </div>
                <p className="text-xs font-bold text-stone-600">Payment ID: {payment.id}</p>
              </div>
            )}

            {paymentMessage ? <p className="text-xs font-black text-emerald-900">{paymentMessage}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
