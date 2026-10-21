"use client";

import { LogIn } from "lucide-react";
import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/app/admin/auth-actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/form-controls";

const initialState: LoginState = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  // Controlled so the email survives a failed attempt; the password is cleared.
  const [email, setEmail] = useState("");

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <FormField id="email" label="Email address" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </FormField>
      <FormField id="password" label="Password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
        />
      </FormField>
      <Button type="submit" size="lg" className="w-full" pending={isPending}>
        {!isPending && <LogIn aria-hidden="true" />}
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
