import { NextRequest, NextResponse } from "next/server";

import {
  clearAtlasSession,
  createAtlasSession,
  readAtlasSession,
  validBootstrapCredential,
} from "@/features/auth/atlas-session";
import {
  clearLoginFailures,
  loginAttemptKey,
  loginAttemptStatus,
  registerLoginFailure,
} from "@/features/auth/login-attempt-guard";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const session = await readAtlasSession();
  if (!session) {
    return NextResponse.json(
      { authenticated: false, message: "Sessão não autenticada." },
      { status: 401, headers: NO_STORE },
    );
  }
  return NextResponse.json(
    {
      authenticated: true,
      actor: { id: session.actorId, role: session.role },
      expiresAt: new Date(session.expiresAt * 1000).toISOString(),
    },
    { headers: NO_STORE },
  );
}

export async function POST(request: NextRequest) {
  const attemptKey = loginAttemptKey(request);
  const status = loginAttemptStatus(attemptKey);

  if (!status.allowed) {
    return NextResponse.json(
      {
        authenticated: false,
        message: "Muitas tentativas. Aguarde antes de tentar novamente.",
      },
      {
        status: 429,
        headers: {
          ...NO_STORE,
          "Retry-After": String(status.retryAfterSeconds),
        },
      },
    );
  }

  let payload: { credential?: unknown };
  try {
    payload = (await request.json()) as { credential?: unknown };
  } catch {
    registerLoginFailure(attemptKey);
    return NextResponse.json(
      { authenticated: false, message: "Requisição de autenticação inválida." },
      { status: 400, headers: NO_STORE },
    );
  }

  if (!(await validBootstrapCredential(payload.credential))) {
    const failure = registerLoginFailure(attemptKey);
    return NextResponse.json(
      {
        authenticated: false,
        message: failure.locked
          ? "Muitas tentativas. Aguarde antes de tentar novamente."
          : "Credencial institucional inválida.",
      },
      {
        status: failure.locked ? 429 : 401,
        headers: {
          ...NO_STORE,
          ...(failure.locked
            ? { "Retry-After": String(failure.retryAfterSeconds) }
            : {}),
        },
      },
    );
  }

  clearLoginFailures(attemptKey);
  const session = await createAtlasSession();
  return NextResponse.json(
    {
      authenticated: true,
      actor: { id: session.actorId, role: session.role },
      expiresAt: new Date(session.expiresAt * 1000).toISOString(),
    },
    { headers: NO_STORE },
  );
}

export async function DELETE() {
  await clearAtlasSession();
  return NextResponse.json({ authenticated: false }, { headers: NO_STORE });
}
