import { contentDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, revalidateMainSite } from "@/lib/apiHelpers";

export async function GET(req: Request) {
  try {
    const auth = await authorize(req, "content.view");
    if (!auth.ok) return auth.response;
    const faqs = await contentDb.faqs();
    return ok({ data: faqs, total: faqs.length });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorize(req, "content.edit");
    if (!auth.ok) return auth.response;
    const body = await req.json();
    const faq = await contentDb.createFaq(body);
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "content.faq.create",
      resourceType: "faq",
      resourceId: faq?.id ?? "",
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(faq, 201);
  } catch (error) {
    return handleError(error);
  }
}
