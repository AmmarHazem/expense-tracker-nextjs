import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { processImport } from "@/lib/import-processor";

// Deterministic parsing is near-instant, but the LLM fallback can be slow, so
// keep the max the Hobby plan allows. The client no longer waits on this
// request — it polls the job status — so it never sees a 504.
export const maxDuration = 60;

export async function POST(request: Request) {
  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // 2. Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }

  // 3. Read the file, create a job row, and process it after responding so the
  //    upload request returns immediately (large statements never time out).
  const buffer = Buffer.from(await file.arrayBuffer());
  const job = await prisma.importJob.create({
    data: { userId, fileName: file.name, status: "processing" },
  });

  after(async () => {
    await processImport(job.id, userId, buffer);
  });

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
