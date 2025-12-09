"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
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
    <Card>
      <CardHeader>
        <CardTitle>Invoice History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invoices.map((invoice, index) => (
            <div key={invoice.id}>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {new Date(invoice.created * 1000).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {invoice.hostedInvoiceUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(invoice.hostedInvoiceUrl, "_blank");
                      }}
                    >
                      View
                    </Button>
                  )}
                  {invoice.invoicePdf && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        window.open(invoice.invoicePdf, "_blank");
                      }}
                    >
                      <i className="ri-download-line text-lg" />
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
