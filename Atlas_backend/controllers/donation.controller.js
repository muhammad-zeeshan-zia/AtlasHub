const mongoose = require("mongoose");
const Stripe = require("stripe");
const Donation = require("../models/donation.model");

const MIN_USD = 1;
const MAX_USD = 50000;

function normalizeFrontendBase(raw) {
  let value = String(raw || "").trim().replace(/\/+$/, "");
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) {
    value = `http://${value}`;
  }
  try {
    const parsed = new URL(value);
    let path = parsed.pathname.replace(/\/+$/, "");
    if (path === "/") path = "";
    return `${parsed.origin}${path}`;
  } catch {
    return "";
  }
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

exports.createCheckoutSession = async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ message: "Payments are not configured on the server." });
    }

    const frontendUrl = normalizeFrontendBase(process.env.FRONTEND_URL);
    if (!frontendUrl) {
      return res.status(500).json({
        message:
          "FRONTEND_URL must be set to your site origin (e.g. http://127.0.0.1:5500) with no trailing slash."
      });
    }

    const rawAmount = req.body?.amountUsd;
    const amount = typeof rawAmount === "string" ? parseFloat(rawAmount) : Number(rawAmount);

    if (!Number.isFinite(amount) || amount < MIN_USD || amount > MAX_USD) {
      return res.status(400).json({
        message: `Enter an amount between $${MIN_USD} and $${MAX_USD.toLocaleString("en-US")}.`
      });
    }

    const amountCents = Math.round(amount * 100);
    if (amountCents < 100) {
      return res.status(400).json({ message: "Minimum donation is $1.00." });
    }

    const userId = req.user.id;

    const donation = await Donation.create({
      userId,
      amountCents,
      currency: "usd",
      status: "pending"
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: "Atlas Hub donation",
              description: "Thank you for supporting Atlas Hub."
            }
          }
        }
      ],
      success_url: `${frontendUrl}/about.html?donation_success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/about.html#donate`,
      client_reference_id: donation._id.toString(),
      metadata: {
        donationId: donation._id.toString(),
        userId: String(userId)
      }
    });

    donation.stripeSessionId = session.id;
    await donation.save();

    return res.json({ url: session.url });
  } catch (error) {
    console.error("createCheckoutSession:", error);
    return res.status(500).json({
      message: "Could not start checkout.",
      error: error.message
    });
  }
};

exports.handleStripeWebhook = async (req, res) => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.error("Stripe webhook: STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET missing.");
    return res.status(503).send("Webhook not configured.");
  }

  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const donationId = session.metadata?.donationId || session.client_reference_id;
        if (!donationId || !mongoose.Types.ObjectId.isValid(donationId)) {
          break;
        }

        const paid =
          session.payment_status === "paid" ||
          session.payment_status === "no_payment_required";
        if (!paid) {
          break;
        }

        const completedFilter = {
          _id: donationId,
          stripeSessionId: session.id,
          status: "pending"
        };
        if (session.metadata?.userId) {
          completedFilter.userId = session.metadata.userId;
        }

        await Donation.findOneAndUpdate(completedFilter, {
          $set: {
            status: "completed",
            stripePaymentIntentId: session.payment_intent
              ? String(session.payment_intent)
              : "",
            failureReason: ""
          }
        });
        break;
      }
      case "checkout.session.async_payment_failed": {
        const session = event.data.object;
        await Donation.findOneAndUpdate(
          { stripeSessionId: session.id, status: "pending" },
          {
            $set: {
              status: "failed",
              failureReason: session.payment_status || "async_payment_failed"
            }
          }
        );
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object;
        await Donation.findOneAndUpdate(
          { stripeSessionId: session.id, status: "pending" },
          {
            $set: {
              status: "expired",
              failureReason: "checkout_expired"
            }
          }
        );
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return res.status(500).json({ received: false });
  }

  return res.json({ received: true });
};
