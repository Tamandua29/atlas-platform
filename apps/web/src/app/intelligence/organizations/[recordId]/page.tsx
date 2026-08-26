import Link from "next/link";

import { OrganizationProfileClient } from "./organization-profile-client";

export default async function OrganizationProfilePage({
  params,
}: {
  params: Promise<{ recordId: string }>;
}) {
  const { recordId } = await params;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-5">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
              Atlas Intelligence Platform
            </p>
            <h1 className="mt-1 text-xl font-semibold">
              Ficha organizacional protegida
            </h1>
          </div>
          <Link
            href="/intelligence/organizations"
            className="rounded-xl border border-slate-700 px-4 py-2.5 hover:border-cyan-400"
          >
            Voltar ao diretório
          </Link>
        </div>
      </header>
      <OrganizationProfileClient recordId={recordId} />
    </main>
  );
}
