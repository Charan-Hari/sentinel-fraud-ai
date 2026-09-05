export async function GET() {
  const fraudApiUrl = process.env.FRAUD_API_URL ?? "http://127.0.0.1:8000";

  try {
    const response = await fetch(`${fraudApiUrl}/governance`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json(
        { error: "Model governance service returned an error." },
        { status: 502 },
      );
    }

    return Response.json(await response.json());
  } catch {
    return Response.json(
      { error: "Model governance service is unavailable." },
      { status: 502 },
    );
  }
}
