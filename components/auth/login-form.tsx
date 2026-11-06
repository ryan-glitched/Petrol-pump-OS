"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { login } from "@/app/actions/auth";
import { idleState } from "@/lib/actions/helpers";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, idleState);
  const common =
    "mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400";

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="text-sm font-bold">Email</span>
        <input className={common} name="email" type="email" placeholder="owner@pgl.local" />
        {state.errors?.email ? <span className="mt-1 block text-xs font-semibold text-red-600">{state.errors.email}</span> : null}
      </label>
      <label className="block">
        <span className="text-sm font-bold">Password</span>
        <input className={common} name="password" type="password" placeholder="••••••••" />
        {state.errors?.password ? <span className="mt-1 block text-xs font-semibold text-red-600">{state.errors.password}</span> : null}
      </label>
      {state.message ? (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          <AlertCircle className="h-4 w-4" />
          {state.message}
        </div>
      ) : null}
      <button
        className="block w-full rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        {pending ? "Signing in…" : "Enter dashboard"}
      </button>
      <p className="text-center text-xs text-slate-400">
        Demo accounts: owner@ / manager@ / cashier@ / filler@ / superadmin@pgl.local · password <span className="font-bold">demo1234</span>
      </p>
    </form>
  );
}
