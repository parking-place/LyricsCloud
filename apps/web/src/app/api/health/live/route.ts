export function GET() {
  return Response.json({ status: "ok", service: "web", check: "liveness" });
}
