"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { InvoiceInfo } from "@/lib/services/billing";

type InvoiceListProps = {
  invoices: InvoiceInfo[];
  isLoading?: boolean;
};

const formatCurrency = (amount: number, currency: string, locale = "en-US") => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "paid":
      return <Badge variant="success">Paid</Badge>;
    case "open":
      return <Badge variant="outline">Open</Badge>;
    case "draft":
      return <Badge variant="outline">Draft</Badge>;
    case "void":
      return <Badge variant="outline">Void</Badge>;
    case "uncollectible":
      return <Badge variant="outline">Uncollectible</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export function InvoiceList({ invoices, isLoading }: InvoiceListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full bg-card dark:bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No invoices found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-0 bg-white dark:bg-card">
      <CardHeader className="p-0">
        <CardTitle className="bg-card dark:bg-muted px-3 py-1 rounded-t-xl font-normal text-sm">
          Invoice history
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-0">
        <div className="space-y-2">
          {invoices.map((invoice, index) => (
            <div key={invoice.id}>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(invoice.status)}
                    <div className="text-sm font-medium">
                      <p>
                        {new Date(invoice.created * 1000).toLocaleDateString(
                          undefined,
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {invoice.invoicePdf && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (invoice.invoicePdf) {
                          window.open(invoice.invoicePdf, "_blank");
                        }
                      }}
                    >
                      <i className="ri-download-line text-lg" />
                    </Button>
                  )}

                  {invoice.hostedInvoiceUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (invoice.hostedInvoiceUrl) {
                          window.open(invoice.hostedInvoiceUrl, "_blank");
                        }
                      }}
                    >
                      View
                    </Button>
                  )}
                </div>
              </div>
              {index < invoices.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
