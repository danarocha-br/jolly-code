"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PaymentMethodInfo } from "@/lib/services/billing";

type PaymentMethodProps = {
  paymentMethod: PaymentMethodInfo | null;
  isLoading?: boolean;
};

const getCardBrandIcon = (brand: string) => {
  const brandLower = brand.toLowerCase();
  if (brandLower.includes("visa")) return "💳";
  if (brandLower.includes("mastercard")) return "💳";
  if (brandLower.includes("amex")) return "💳";
  if (brandLower.includes("discover")) return "💳";
  return "💳";
};

export function PaymentMethod({
  paymentMethod,
  isLoading,
}: PaymentMethodProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!paymentMethod) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No payment method on file
          </p>
        </CardContent>
      </Card>
    );
  }

  if (paymentMethod.type === "card" && paymentMethod.card) {
    const { brand, last4, expMonth, expYear } = paymentMethod.card;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getCardBrandIcon(brand)}</span>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {brand.charAt(0).toUpperCase() + brand.slice(1)} •••• {last4}
              </p>
              <p className="text-xs text-muted-foreground">
                Expires {expMonth.toString().padStart(2, "0")}/{expYear}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {paymentMethod.type.charAt(0).toUpperCase() +
            paymentMethod.type.slice(1)}
        </p>
      </CardContent>
    </Card>
  );
}

