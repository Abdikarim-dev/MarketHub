"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ordersApi, paymentsApi } from "@/services/api";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

function PaymentForm({
  orderId,
  amount,
  clientSecret,
}: {
  orderId: number;
  amount: string;
  clientSecret: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const clearCart = useCartStore((s) => s.clear);
  const [submitting, setSubmitting] = useState(false);
  const [elementReady, setElementReady] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !elementReady) {
      toast.error("Payment form is still loading. Please wait a moment.");
      return;
    }

    setSubmitting(true);
    try {
      // Required before confirmPayment when using Payment Element.
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast.error(submitError.message || "Please check your card details.");
        return;
      }

      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/orders/${orderId}?paid=1`,
        },
      });

      if (result.error) {
        toast.error(result.error.message || "Payment failed");
        return;
      }

      const intent = result.paymentIntent;
      if (!intent || intent.status !== "succeeded") {
        toast.error("Payment was not completed. Please try again.");
        return;
      }

      await paymentsApi.confirm(orderId, intent.id);
      clearCart();
      sessionStorage.removeItem(`mh_pi_${orderId}`);
      toast.success("Payment successful");
      router.replace(`/orders/${orderId}?paid=1`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not confirm payment"));
    } finally {
      setSubmitting(false);
    }
  };

  const canPay = Boolean(stripe && elements && elementReady && !submitting);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Keep Payment Element visible — hiding it with sr-only/display:none
          prevents Stripe from treating it as mounted. */}
      <PaymentElement
        id="payment-element"
        options={{ layout: "tabs" }}
        onReady={() => setElementReady(true)}
        onLoadError={(event) => {
          toast.error(
            event.error?.message ||
              "Could not load the payment form. Refreshing…",
          );
          sessionStorage.removeItem(`mh_pi_${orderId}`);
          window.location.reload();
        }}
      />
      {!elementReady && (
        <p className="text-center text-xs text-slate-500">
          Loading secure payment form…
        </p>
      )}
      <Button type="submit" className="w-full" disabled={!canPay}>
        {submitting
          ? "Processing..."
          : !elementReady
            ? "Preparing form..."
            : `Pay ${formatCurrency(amount)}`}
      </Button>
      <p className="text-center text-xs text-slate-500">
        Use Stripe test card <strong>4242 4242 4242 4242</strong>, any future
        expiry, any CVC.
      </p>
    </form>
  );
}

export default function CheckoutPayPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const user = useAuthStore((s) => s.user);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(true);

  const order = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersApi.get(orderId),
    enabled: !!user && !!orderId,
  });

  const createIntent = useCallback(async (id: string, forceNew = false) => {
    setLoadingIntent(true);
    setBootError(null);
    try {
      if (!forceNew) {
        const raw = sessionStorage.getItem(`mh_pi_${id}`);
        if (raw) {
          const parsed = JSON.parse(raw) as { clientSecret?: string };
          if (parsed.clientSecret) {
            setClientSecret(parsed.clientSecret);
            return;
          }
        }
      } else {
        sessionStorage.removeItem(`mh_pi_${id}`);
      }

      const intent = await paymentsApi.createIntent(Number(id));
      sessionStorage.setItem(
        `mh_pi_${id}`,
        JSON.stringify({
          clientSecret: intent.client_secret,
          paymentId: intent.payment.id,
        }),
      );
      setClientSecret(intent.client_secret);
    } catch (e) {
      setBootError(getErrorMessage(e, "Unable to start payment"));
      setClientSecret(null);
    } finally {
      setLoadingIntent(false);
    }
  }, []);

  useEffect(() => {
    if (!orderId || !user) return;
    void createIntent(orderId);
  }, [orderId, user, createIntent]);

  const options = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: {
              theme: "stripe" as const,
              variables: { borderRadius: "12px" },
            },
          }
        : undefined,
    [clientSecret],
  );

  if (!user) {
    return (
      <div className="container-mh py-16 text-center">
        <Link href="/auth/login">
          <Button>Sign in to pay</Button>
        </Link>
      </div>
    );
  }

  if (!publishableKey || !stripePromise) {
    return (
      <div className="container-mh py-16 text-center text-rose-600">
        Stripe publishable key is missing. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        in `.env.local` and restart the frontend.
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="container-mh space-y-4 py-16 text-center">
        <p className="text-rose-600">{bootError}</p>
        <Button
          variant="outline"
          onClick={() => orderId && void createIntent(orderId, true)}
        >
          Try again
        </Button>
        <Link href="/checkout" className="block">
          <Button variant="ghost">Back to checkout</Button>
        </Link>
      </div>
    );
  }

  if (order.isLoading || loadingIntent || !clientSecret || !options) {
    return (
      <div className="container-mh max-w-lg space-y-4 py-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (order.data?.is_paid) {
    return (
      <div className="container-mh py-16 text-center">
        <p className="text-emerald-700">This order is already paid.</p>
        <Link href={`/orders/${orderId}`}>
          <Button className="mt-4">View order</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-mh max-w-lg py-8">
      <p className="text-sm text-slate-500">
        <Link href="/checkout" className="text-blue-600">
          Checkout
        </Link>{" "}
        · Payment
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-outfit)] text-3xl font-bold">
        Pay for order #{orderId}
      </h1>
      <p className="mt-1 text-slate-600">
        Amount due:{" "}
        <strong>{formatCurrency(order.data?.total_price ?? 0)}</strong>
      </p>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        {/* key forces a clean remount whenever the intent secret changes */}
        <Elements key={clientSecret} stripe={stripePromise} options={options}>
          <PaymentForm
            orderId={Number(orderId)}
            amount={order.data?.total_price ?? "0"}
            clientSecret={clientSecret}
          />
        </Elements>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Wait until the card form finishes loading, then pay. Stock stays reserved
        while payment is pending.
      </p>
    </div>
  );
}
