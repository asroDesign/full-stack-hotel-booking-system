"use client";

import { useActionState } from "react";
import { LogIn, Mail, Lock, AlertCircle } from "lucide-react";
import { login } from "@/app/actions/admin";

export function LoginForm({ demo }: { demo?: { email: string; password: string } | null }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-4" autoComplete="on">
      <fieldset className="fieldset">
        <legend className="fieldset-legend">ایمیل</legend>
        <label className="input w-full">
          <Mail className="h-4 w-4 opacity-50" />
          <input name="email" type="email" dir="ltr" autoComplete="username" defaultValue={demo?.email ?? ""} className="grow text-left" required />
        </label>
      </fieldset>
      <fieldset className="fieldset">
        <legend className="fieldset-legend">رمز عبور</legend>
        <label className="input w-full">
          <Lock className="h-4 w-4 opacity-50" />
          <input name="password" type="password" dir="ltr" autoComplete="current-password" defaultValue={demo?.password ?? ""} className="grow text-left" required />
        </label>
      </fieldset>
      {state?.error && (
        <div role="alert" className="alert alert-error alert-soft text-sm">
          <AlertCircle className="h-4 w-4" /> <span>{state.error}</span>
        </div>
      )}
      <button disabled={pending} className="btn btn-primary btn-block h-12">
        {pending ? <span className="loading loading-spinner loading-sm" /> : <LogIn className="h-4 w-4" />} ورود به پنل
      </button>
    </form>
  );
}
