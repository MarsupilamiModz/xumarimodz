import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="page-container flex justify-center py-20"><div className="h-[420px] w-full max-w-[420px] animate-pulse rounded-xl bg-raised" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
