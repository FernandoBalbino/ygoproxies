import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { MercadoPagoConfig, Payment } from "mercadopago";

const FULL_HD_AMOUNT = 4.99;
const FULL_HD_DESCRIPTION = "YGO Proxies - PDF FULL HD";
const FULL_HD_STATEMENT_DESCRIPTOR = "YGOPROXIES";
const FULL_HD_ITEM_ID = "ygo-proxies-full-hd-pdf";
const FULL_HD_ITEM_TITLE = "PDF FULL HD YGO Proxies";
const FULL_HD_ITEM_DESCRIPTION = "PDF em alta qualidade com proxies Yu-Gi-Oh geradas pelo usuario.";
const FULL_HD_ITEM_CATEGORY = "games";

export interface CreatePixPaymentInput {
  email: string;
  firstName?: string;
  lastName?: string;
  notificationUrl?: string;
  deviceId?: string;
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

function createPaymentClient(): Payment {
  return new Payment(new MercadoPagoConfig({
    accessToken: getAccessToken(),
    options: { timeout: 10000 },
  }));
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
  const firstName = input.firstName?.trim() || "Cliente";
  const lastName = input.lastName?.trim() || "YGO Proxies";
  const payload = {
    transaction_amount: FULL_HD_AMOUNT,
    description: FULL_HD_DESCRIPTION,
    statement_descriptor: FULL_HD_STATEMENT_DESCRIPTOR,
    payment_method_id: "pix",
    external_reference: externalReference,
    notification_url: input.notificationUrl,
    metadata: {
      product_id: FULL_HD_ITEM_ID,
      product: "full_hd_pdf",
      integration: "ygoproxies",
    },
    payer: {
      email: input.email,
      first_name: firstName,
      last_name: lastName,
    },
    additional_info: {
      items: [
        {
          id: FULL_HD_ITEM_ID,
          title: FULL_HD_ITEM_TITLE,
          description: FULL_HD_ITEM_DESCRIPTION,
          category_id: FULL_HD_ITEM_CATEGORY,
          quantity: 1,
          unit_price: FULL_HD_AMOUNT,
          currency_id: "BRL",
        },
      ],
      payer: {
        first_name: firstName,
        last_name: lastName,
        authentication_type: "Web Nativa",
      },
    },
  };

  try {
    const response = await createPaymentClient().create({
      body: payload,
      requestOptions: {
        idempotencyKey: randomUUID(),
        meliSessionId: input.deviceId?.trim() || undefined,
      },
    });

    return assertMercadoPagoResponse(response as MercadoPagoPixResponse);
  } catch (error) {
    throw new Error(getMercadoPagoErrorMessage(error, "Falha ao criar pagamento Pix."));
  }
}

export async function getPayment(paymentId: string): Promise<MercadoPagoPixResponse> {
  try {
    return await createPaymentClient().get({ id: paymentId }) as MercadoPagoPixResponse;
  } catch (error) {
    throw new Error(getMercadoPagoErrorMessage(error, "Falha ao consultar pagamento."));
  }
}

function getMercadoPagoErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (error && typeof error === "object") {
    const payload = error as {
      message?: unknown;
      error?: unknown;
      cause?: Array<{ description?: string; message?: string; code?: string }>;
    };

    if (typeof payload.message === "string") return payload.message;
    if (typeof payload.error === "string") return payload.error;

    const firstCause = payload.cause?.find((cause) => cause.description || cause.message || cause.code);
    if (firstCause) {
      return firstCause.description || firstCause.message || firstCause.code || fallback;
    }
  }

  return fallback;
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
