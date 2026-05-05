import { NextResponse } from "next/server";
import { extractPaymentId, getPayment, verifyWebhookSignature } from "@/services/mercado-pago.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, route: "mercado-pago-webhook" });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    if (!verifyWebhookSignature(request, payload)) {
      return NextResponse.json({ ok: false, error: "Assinatura invalida." }, { status: 401 });
    }

    const paymentId = extractPaymentId(payload, request.url);
    if (paymentId) {
      try {
        const payment = await getPayment(paymentId);
        console.info("Mercado Pago webhook", {
          paymentId,
          status: payment.status,
          statusDetail: payment.status_detail,
          externalReference: payment.external_reference,
        });
      } catch (paymentError) {
        console.warn("Mercado Pago webhook recebido, mas a consulta do pagamento falhou.", paymentError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Falha no webhook Mercado Pago.", error);
    return NextResponse.json({ ok: true });
  }
}
