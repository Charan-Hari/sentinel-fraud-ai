export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params;
  const fraudApiUrl = process.env.FRAUD_API_URL ?? "http://127.0.0.1:8000";
  const response = await fetch(`${fraudApiUrl}/cases/${encodeURIComponent(caseId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });

  return Response.json(await response.json(), { status: response.status });
}
