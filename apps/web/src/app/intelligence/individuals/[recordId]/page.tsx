import Link from "next/link";

import { IndividualProfileClient } from "./individual-profile-client";

export default async function IndividualProfilePage({
  params,
}: {
  params: Promise<{ recordId: string }>;
}) {
  const { recordId } = await params;

  return (
    <main className="min-h-screen bg-[#050814] text-slate-100">
      <header className="border-b border-slate-800 bg-[#070b17]">
        <div className="mx-auto flex min-h-20 max-w-[1500px] items-center justify-between px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Atlas Intelligence Platform</p>
            <h1 className="mt-1 text-xl font-semibold">Ficha individual protegida</h1>
          </div>
          <Link href="/intelligence/individuals" className="rounded-xl border border-slate-700 px-4 py-2.5 hover:border-cyan-400">
            Voltar ao diretório
          </Link>
        </div>
      </header>
      <IndividualProfileClient recordId={recordId} />
    </main>
  );
}
