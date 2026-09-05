export async function GET(request: Request) {
  const dataset = new URL(request.url).searchParams.get("dataset") ?? "baseline";
  const validDatasets = new Set(["baseline", "routine", "mixed", "escalation"]);

  if (!validDatasets.has(dataset)) {
    return Response.json({ error: "Unknown dashboard dataset." }, { status: 400 });
  }
  const fraudApiUrl = process.env.FRAUD_API_URL ?? "http://127.0.0.1:8000";

  try {
    const response = await fetch(`${fraudApiUrl}/dashboard?dataset=${encodeURIComponent(dataset)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json(
        { error: "Fraud dashboard service returned an error." },
        { status: 502 },
      );
    }

    return Response.json(await response.json());
  } catch {
    return Response.json(
      { error: "Fraud dashboard service is unavailable." },
      { status: 502 },
    );
  }
}
