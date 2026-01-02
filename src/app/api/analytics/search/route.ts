import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/ratelimit";
import crypto from "crypto";

const payloadSchema = z.object({
  query: z.string().trim().min(1).max(200).optional().nullable(),
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).optional().nullable(),
  resultsCount: z.number().int().nonnegative().optional().nullable(),
  page: z.number().int().positive().optional().nullable(),
  path: z.string().trim().max(300).optional().nullable(),
  source: z.string().trim().max(100).optional().nullable(),
});

function hashIp(ip: string | null) {
  if (!ip) return null;
  const salt = process.env.SEARCH_LOG_SALT || "search-log-salt";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const data = payloadSchema.parse(json);

    const ip = getClientIp(req.headers);
    const clientIpHash = hashIp(ip);
    const userAgent = req.headers.get("user-agent");

    await db.searchLog.create({
      data: {
        query: data.query ?? null,
        filters: data.filters ?? undefined,
        resultsCount: data.resultsCount ?? null,
        page: data.page ?? null,
        path: data.path ?? null,
        source: data.source ?? null,
        userAgent,
        clientIpHash,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
