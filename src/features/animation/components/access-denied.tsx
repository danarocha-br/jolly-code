"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FEATURE_FLAG_KEYS } from "@/lib/services/tracking/feature-flag-keys";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type WaitlistState = "idle" | "submitting" | "success" | "error";

export function AnimationAccessDenied() {
  const [status, setStatus] = useState<WaitlistState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setStatus("submitting");
    setMessage(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          feature_key: FEATURE_FLAG_KEYS.betaCodeAnimate,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Unable to join waitlist");
      }

      setStatus("success");
      setMessage("You're on the list! We'll email you when access opens.");
      form.reset();
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FieldGroup >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <Field orientation="horizontal">
                        <FormLabel className="text-sm text-foreground/80">Email</FormLabel>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <FormControl className="flex-1">
                            <Input
                              {...field}
                              placeholder="you@example.com"
                              disabled={status === "submitting" || status === "success"}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </Field>
                      <Button
                        type="submit"
                        disabled={status === "submitting" || status === "success"}
                        className="shrink-0 sm:w-[160px]"
                      >
                        {status === "submitting"
                          ? "Joining..."
                          : status === "success"
                            ? "Joined"
                            : "Join waitlist"}
                      </Button>
                    </FormItem>
                  )}
                />
              </FieldGroup>
            </form>
          </Form>

          {message && (
            <p
              className={cn(
                "p-2 border border-border/70 rounded-md text-sm font-normal",
                status === "error"
                  ? "bg-destructive/10 text-destructive-foreground"
                  : "bg-success/5 text-primary-foreground"
              )}
            >
              <i
                className={cn(
                  "mr-2",
                  status === "error"
                    ? "ri-error-warning-line"
                    : "ri-user-smile-line"
                )}
              ></i>
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
