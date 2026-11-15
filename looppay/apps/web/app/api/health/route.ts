export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(
    { status: "alive", service: "looppay-web" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
