import { NextResponse } from "next/server";
import { createPixPayment } from "@/services/mercado-pago.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildWebhookUrl(request: Request): string | undefined {
  const configuredUrl = process.env.MERCADO_PAGO_WEBHOOK_URL;
  if (configuredUrl) {
    return configuredUrl;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1") {
    return undefined;
  }

  const url = new URL("/api/mercado-pago/webhook", request.url);
  url.searchParams.set("source_news", "webhooks");
  return url.toString();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      firstName?: string;
      lastName?: string;
      deviceId?: string;
    };

    if (!body.email?.trim()) {
      return NextResponse.json({ error: "Informe o e-mail para gerar o Pix." }, { status: 400 });
    }

    const payment = await createPixPayment({
      email: body.email.trim(),
      firstName: body.firstName?.trim() || undefined,
      lastName: body.lastName?.trim() || undefined,
      notificationUrl: buildWebhookUrl(request),
      deviceId: body.deviceId?.trim() || undefined,
    });

    return NextResponse.json({ payment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar Pix.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
