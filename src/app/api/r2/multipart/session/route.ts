import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computePartCount, PART_SIZE } from "@/lib/r2-multipart";
import { fileSizeNumber } from "@/lib/file-size";

/** Stand einer Multipart-Upload-Sitzung zum Fortsetzen (nur für den Besitzer). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId is required" }, { status: 400 });

  const session = await prisma.storageUploadSession.findFirst({
    where: { id: sessionId, userId: user.id },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const expired = session.expiresAt < new Date();
  return NextResponse.json({
    sessionId: session.id,
    partSize: PART_SIZE,
    partCount: computePartCount(fileSizeNumber(session.fileSize)),
    completedParts: Array.isArray(session.completedParts) ? session.completedParts : [],
    status: expired ? "EXPIRED" : session.status,
  });
}
