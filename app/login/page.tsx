import { redirect } from "next/navigation";
import { Fuel, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { getFreshSession } from "@/lib/auth/guard";

export default async function LoginPage() {
  if (await getFreshSession()) redirect("/");

  return (
    <main className="grid min-h-screen bg-[#071827] text-white lg:grid-cols-[1fr_0.9fr]">
      <section className="relative overflow-hidden p-8 md:p-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,.25),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,.18),transparent_32%)]" />
        <div className="relative z-10 flex min-h-full flex-col justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">PGL / PARCO Gunvor Limited</p>
            <h1 className="mt-5 max-w-3xl text-5xl font-black tracking-tight md:text-7xl">PetrolPumpOS</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              Multi-branch petrol pump ERP, analytics, and management insights for Shahid Mohsin.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {["Real persistence", "Role-based access", "Fuel-loss variance"].map((item) => (
              <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur" key={item}>
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <p className="mt-4 font-bold">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center bg-white p-6 text-slate-950">
        <div className="w-full max-w-md rounded-[2rem] border border-slate-200 p-6 shadow-2xl shadow-slate-950/10">
          <div className="mb-6 flex items-center gap-3">
            <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
              <Fuel className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-black">Sign in</h2>
              <p className="text-sm text-slate-500">Use a seeded demo account.</p>
            </div>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
