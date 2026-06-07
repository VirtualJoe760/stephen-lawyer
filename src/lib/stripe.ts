import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

export const stripe = key
  ? new Stripe(key, { apiVersion: "2024-11-20.acacia" })
  : (new Proxy(
      {},
      {
        get() {
          throw new Error("STRIPE_SECRET_KEY is not set.");
        },
      },
    ) as Stripe);

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
