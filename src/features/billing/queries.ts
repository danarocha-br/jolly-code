import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import {
  getBillingInfo,
  type BillingInfo,
  type PaymentMethodInfo,
  type InvoiceInfo,
} from "@/lib/services/billing";

const BILLING_QUERY_STALE_TIME_MS = 5 * 60 * 1000;

export const fetchBillingInfo = async (
  userId?: string
): Promise<BillingInfo | null> => {
  const supabase = createClient();
  const resolvedUserId =
    userId ??
    (
      await supabase.auth.getUser().then(({ data }) => {
        return data.user?.id;
      })
    );

  if (!resolvedUserId) {
    throw new Error("User not authenticated");
  }

  return getBillingInfo(supabase, resolvedUserId);
};

export const useBillingInfo = (userId?: string) => {
  return useQuery<BillingInfo | null>({
    queryKey: ["billing-info", userId],
    queryFn: () => fetchBillingInfo(userId),
    staleTime: BILLING_QUERY_STALE_TIME_MS,
    enabled: Boolean(userId),
  });
};

export const fetchPaymentMethod = async (
  customerId?: string
): Promise<PaymentMethodInfo | null> => {
  if (!customerId) {
    return null;
  }

  try {
    const response = await fetch(`/api/billing/payment-method?customerId=${customerId}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.paymentMethod || null;
  } catch (error) {
    console.error("Error fetching payment method:", error);
    return null;
  }
};

export const usePaymentMethod = (customerId?: string) => {
  return useQuery<PaymentMethodInfo | null>({
    queryKey: ["payment-method", customerId],
    queryFn: () => fetchPaymentMethod(customerId),
    staleTime: BILLING_QUERY_STALE_TIME_MS,
    enabled: Boolean(customerId),
    retry: 1, // Only retry once on failure
    retryDelay: 1000,
  });
};

export const fetchInvoices = async (
  customerId?: string
): Promise<InvoiceInfo[]> => {
  if (!customerId) {
    return [];
  }

  try {
    const response = await fetch(`/api/billing/invoices?customerId=${encodeURIComponent(customerId)}`);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Unauthorized");
      }
      return [];
    }
    const data = await response.json();
    return data.invoices || [];
  } catch (error) {
    console.error("Error fetching invoices:", error);
    throw error;
  }
};

export const useInvoices = (customerId?: string) => {
  return useQuery<InvoiceInfo[]>({
    queryKey: ["invoices", customerId],
    queryFn: () => fetchInvoices(customerId),
    staleTime: BILLING_QUERY_STALE_TIME_MS,
    enabled: Boolean(customerId),
    retry: 1, // Only retry once on failure
    retryDelay: 1000,
  });
};

