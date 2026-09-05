export async function POST(request: Request) {
  const fraudApiUrl = process.env.FRAUD_API_URL ?? "http://127.0.0.1:8000";
  const response = await fetch(`${fraudApiUrl}/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });

  return Response.json(await response.json(), { status: response.status });
}
