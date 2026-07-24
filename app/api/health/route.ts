export const runtime = "nodejs";

export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "podcast-pacer",
      version: "0.1.0",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
