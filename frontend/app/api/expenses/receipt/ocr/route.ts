const backendBaseUrl = (process.env.BACKEND_INTERNAL_URL || "http://backend:8080").replace(/\/+$/, "");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = new Headers();
  const password = request.headers.get("x-app-password");
  if (password) {
    headers.set("x-app-password", password);
  }

  try {
    // Recreate multipart data here instead of using a Next.js rewrite. This
    // keeps the upload and the response on one explicit Node route, which is
    // more reliable for larger multipart requests over Tailnet connections.
    const formData = await request.formData();
    const upstream = await fetch(`${backendBaseUrl}/api/expenses/receipt/ocr`, {
      method: "POST",
      headers,
      body: formData,
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) {
      responseHeaders.set("content-type", contentType);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { message: "Nie udało się przekazać zdjęcia do analizy. Spróbuj ponownie." },
      { status: 502 },
    );
  }
}
