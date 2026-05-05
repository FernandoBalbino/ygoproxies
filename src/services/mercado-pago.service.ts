import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const MERCADO_PAGO_API_URL = "https://api.mercadopago.com";
const FULL_HD_AMOUNT = 4.99;
const FULL_HD_DESCRIPTION = "YGO Proxies - PDF FULL HD";

export interface CreatePixPaymentInput {
  email: string;
  firstName?: string;
  lastName?: string;
  notificationUrl?: string;
}

export interface PixPaymentResult {
  id: number;
  status: string;
  statusDetail: string;
  externalReference: string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string;
  amount: number;
}

interface MercadoPagoPixResponse {
  id: number;
  status: string;
  status_detail: string;
  external_reference?: string;
  transaction_amount?: number;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
}

interface MercadoPagoWebhookPayload {
  type?: string;
  action?: string;
  data?: {
    id?: string | number;
  };
}

function getAccessToken(): string {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN nao configurado.");
  }

  return accessToken;
}

function assertMercadoPagoResponse(response: MercadoPagoPixResponse): PixPaymentResult {
  const transactionData = response.point_of_interaction?.transaction_data;
  if (!response.id || !transactionData?.qr_code || !transactionData.qr_code_base64 || !transactionData.ticket_url) {
    throw new Error("Mercado Pago nao retornou os dados do Pix.");
  }

  return {
    id: response.id,
    status: response.status,
    statusDetail: response.status_detail,
    externalReference: response.external_reference ?? "",
    qrCode: transactionData.qr_code,
    qrCodeBase64: transactionData.qr_code_base64,
    ticketUrl: transactionData.ticket_url,
    amount: response.transaction_amount ?? FULL_HD_AMOUNT,
  };
}

export async function createPixPayment(input: CreatePixPaymentInput): Promise<PixPaymentResult> {
  const externalReference = `ygoproxies-full-hd-${randomUUID()}`;
  const payload = {
    transaction_amount: FULL_HD_AMOUNT,
    description: FULL_HD_DESCRIPTION,
    payment_method_id: "pix",
    external_reference: externalReference,
    notification_url: input.notificationUrl,
    payer: {
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
    },
  };

  const response = await fetch(`${MERCADO_PAGO_API_URL}/v1/payments`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
      "X-Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as MercadoPagoPixResponse & { message?: string; error?: string };
  if (!response.ok) {
    throw new Error(body.message || body.error || "Falha ao criar pagamento Pix.");
  }

  return assertMercadoPagoResponse(body);
}

export async function getPayment(paymentId: string): Promise<MercadoPagoPixResponse> {
  const response = await fetch(`${MERCADO_PAGO_API_URL}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as MercadoPagoPixResponse & { message?: string; error?: string };
  if (!response.ok) {
    throw new Error(body.message || body.error || "Falha ao consultar pagamento.");
  }

  return body;
}

function parseSignature(signature: string): { timestamp?: string; hash?: string } {
  return signature.split(",").reduce<{ timestamp?: string; hash?: string }>((accumulator, part) => {
    const [key, value] = part.split("=");
    if (key?.trim() === "ts") accumulator.timestamp = value?.trim();
    if (key?.trim() === "v1") accumulator.hash = value?.trim();
    return accumulator;
  }, {});
}

export function verifyWebhookSignature(request: Request, payload: MercadoPagoWebhookPayload): boolean {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) {
    return true;
  }

  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signature || !requestId) {
    return false;
  }

  const { timestamp, hash } = parseSignature(signature);
  if (!timestamp || !hash) {
    return false;
  }

  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? String(payload.data?.id ?? "").toLowerCase();
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const expectedHash = createHmac("sha256", secret).update(manifest).digest("hex");
  if (expectedHash.length !== hash.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expectedHash), Buffer.from(hash));
}

export function extractPaymentId(payload: MercadoPagoWebhookPayload, requestUrl: string): string | null {
  const url = new URL(requestUrl);
  return url.searchParams.get("data.id")
    ?? url.searchParams.get("id")
    ?? (payload.data?.id !== undefined ? String(payload.data.id) : null);
}
