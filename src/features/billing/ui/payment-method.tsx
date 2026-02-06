"use client";
import { FaCcAmex, FaCcDiscover, FaCcMastercard, FaCcVisa } from "react-icons/fa";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaymentMethodInfo } from "@/lib/services/billing";

type PaymentMethodProps = {
  paymentMethod: PaymentMethodInfo | null;
  isLoading?: boolean;
};

const getCardBrandIcon = (brand: string) => {
  const brandLower = brand.toLowerCase();
  if (brandLower.includes("visa")) return <FaCcVisa />;
  if (brandLower.includes("mastercard")) return <FaCcMastercard />;
  if (brandLower.includes("amex")) return <FaCcAmex />;
  if (brandLower.includes("discover")) return <FaCcDiscover />;
  return <FaCcVisa />;
};

export function PaymentMethod({
  paymentMethod,
  isLoading,
}: PaymentMethodProps) {
  if (isLoading) {
    return (
      <Card className="p-0 bg-white dark:bg-card">
        <CardHeader className="p-0">
          <CardTitle className="bg-card dark:bg-muted px-3 py-1 rounded-t-xl font-normal text-sm">Payment method</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <Skeleton className="h-6 w-full bg-card dark:bg-muted/50" />
        </CardContent>
      </Card>
    );
  }

  if (!paymentMethod) {
    return (
      null
    );
  }

  if (paymentMethod.type === "card" && paymentMethod.card) {
    const { brand, last4, expMonth, expYear } = paymentMethod.card;
    return (
      <Card className="p-0 bg-white dark:bg-card">
      <CardHeader className="p-0">
          <CardTitle className="bg-card dark:bg-muted px-3 py-1 rounded-t-xl font-normal text-sm">Payment method</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getCardBrandIcon(brand)}</span>
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {brand.charAt(0).toUpperCase() + brand.slice(1)} •••• {last4}
              </p>
              <p className="text-xs text-muted-foreground">
                Expires {expMonth.toString().padStart(2, "0")}/{(expYear % 100).toString().padStart(2, "0")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-0 bg-white dark:bg-card">
      <CardHeader className="p-0">
        <CardTitle className="bg-card dark:bg-muted px-3 py-1 rounded-t-xl font-normal text-sm" >Payment method</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-sm">
          {paymentMethod.type.charAt(0).toUpperCase() +
            paymentMethod.type.slice(1)}
        </p>
      </CardContent>
    </Card>
  );
}

