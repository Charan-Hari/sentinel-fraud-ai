import { z } from "zod";

const schema = z.object({
  transactionType: z.string().min(1),
  amount: z.number().finite().nonnegative(),
  originBalanceBefore: z.number().finite().nonnegative(),
  originBalanceAfter: z.number().finite().nonnegative(),
  destinationBalanceBefore: z.number().finite().nonnegative(),
  destinationBalanceAfter: z.number().finite().nonnegative(),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const transaction = schema.safeParse(body);

  if (!transaction.success) {
    return Response.json(
      { error: "Transaction input is invalid.", details: transaction.error.issues },
      { status: 400 },
    );
  }

  const fraudApiUrl = process.env.FRAUD_API_URL ?? "http://127.0.0.1:8000";
  const response = await fetch(`${fraudApiUrl}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transaction.data),
    cache: "no-store",
  });

  if (!response.ok) {
    return Response.json(
      { error: "Fraud scoring service is unavailable. Confirm the FastAPI server is running." },
      { status: 502 },
    );
  }

  return Response.json(await response.json());
}
