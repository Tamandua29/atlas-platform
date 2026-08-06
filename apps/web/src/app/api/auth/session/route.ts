import { NextRequest, NextResponse } from "next/server";

import {
  clearAtlasSession,
  createAtlasSession,
  readAtlasSession,
  validBootstrapCredential,
} from "@/features/auth/atlas-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readAtlasSession();
  if (!session) {
    return NextResponse.json(
      { authenticated: false, message: "Sessão não autenticada." },
      { status: 401, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }
  return NextResponse.json(
    {
      authenticated: true,
      actor: { id: session.actorId, role: session.role },
      expiresAt: new Date(session.expiresAt * 1000).toISOString(),
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as { credential?: unknown };
  if (!validBootstrapCredential(payload.credential)) {
    return NextResponse.json(
      { authenticated: false, message: "Credencial institucional inválida." },
      { status: 401 },
    );
  }
  const session = await createAtlasSession();
  return NextResponse.json(
    {
      authenticated: true,
      actor: { id: session.actorId, role: session.role },
      expiresAt: new Date(session.expiresAt * 1000).toISOString(),
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}

export async function DELETE() {
  await clearAtlasSession();
  return NextResponse.json({ authenticated: false });
}
