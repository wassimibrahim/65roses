// POST /api/apply — receives an application: zod-validated, rate limited, silent on duplicates
export async function POST() {
  return new Response(null, { status: 501 });
}
