export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const fraudApiUrl = process.env.FRAUD_API_URL ?? "http://127.0.0.1:8000";

  try {
    const response = await fetch(`${fraudApiUrl}/case-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const payload = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: "AI investigator brief could not be generated.", details: payload.detail },
        { status: response.status },
      );
    }

    return Response.json(payload);
  } catch {
    return Response.json(
      { error: "AI investigator service is unavailable." },
      { status: 502 },
    );
  }
}
