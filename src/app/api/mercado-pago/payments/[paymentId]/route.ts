import { NextResponse } from "next/server";
import { getPayment } from "@/services/mercado-pago.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  try {
    const { paymentId } = await params;
    const payment = await getPayment(paymentId);

    return NextResponse.json({
      payment: {
        id: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail,
        externalReference: payment.external_reference ?? "",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao consultar pagamento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
