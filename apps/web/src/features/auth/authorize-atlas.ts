import { NextResponse } from "next/server";

import {
  hasRole,
  readAtlasSession,
  type AtlasRole,
  type AtlasSession,
} from "@/features/auth/atlas-session";

export type AuthorizationResult =
  | { authorized: true; session: AtlasSession }
  | { authorized: false; response: NextResponse };

export async function authorizeAtlas(
  roles: AtlasRole[] = ["reviewer"],
): Promise<AuthorizationResult> {
  const session = await readAtlasSession();
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: "Sessão expirada ou não autenticada." },
        { status: 401 },
      ),
    };
  }
  if (!hasRole(session, roles)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: "Seu perfil não possui permissão para esta operação." },
        { status: 403 },
      ),
    };
  }
  return { authorized: true, session };
}
