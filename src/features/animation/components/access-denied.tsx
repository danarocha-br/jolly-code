"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FEATURE_FLAG_KEYS } from "@/lib/services/tracking/feature-flag-keys";
import { cn } from "@/lib/utils";

type WaitlistState = "idle" | "submitting" | "success" | "error";

export function AnimationAccessDenied() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<WaitlistState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) return;

    setStatus("submitting");
    setMessage(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          feature_key: FEATURE_FLAG_KEYS.betaCodeAnimate,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Unable to join waitlist");
      }

      setStatus("success");
      setMessage("You're on the list! We'll email you when access opens.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setStatus((prev) => (prev === "submitting" ? "idle" : prev));
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-24">
      <Card className="p-0 max-w-xl w-full text-center backdrop-blur">
        <CardHeader className="space-y-2 p-4">
          <CardTitle className="text-xl">Code animation is in beta</CardTitle>
          <p className="text-muted-foreground px-3">
            We are rolling this feature out gradually. Join the waitlist to be notified
            when your workspace is eligible.
          </p>
        </CardHeader>

        <CardContent className="space-y-4 border-t border-border/70 p-4 text-left">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="text-sm text-foreground/80" htmlFor="waitlist-email">
              Email
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                id="waitlist-email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={status === "submitting" || status === "success"}
              />
              <Button
                type="submit"
                disabled={status === "submitting" || status === "success"}
                className="shrink-0 sm:w-[160px]"
              >
                {status === "submitting" ? "Joining..." : status === "success" ? "Joined" : "Join waitlist"}
              </Button>
            </div>
          </form>

          {message && (
            <p className={cn("p-2 border border-border/70 rounded-md text-sm font-normal", status === "error" ? "bg-destructive/10 text-destructive-foreground" : "bg-success/5 text-primary-foreground")}>
              <i className={cn("mr-2", status === "error" ? "ri-error-warning-line" : "ri-user-smile-line")}></i>
              {message}
            </p>
          )}

        </CardContent>
        <div className="flex items-center gap-3 p-2 border-t border-border/70">
          <Button variant="ghost" asChild className="flex-1 text-foreground/80">
            <Link href="/">Return home</Link>
          </Button>

        </div>
      </Card>
    </div>
  );
}
