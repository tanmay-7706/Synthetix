import arcjet, {
  tokenBucket,
  detectPromptInjection,
  sensitiveInfo,
} from "@arcjet/next";

const isDev =
  process.env.NODE_ENV === "development" ||
  process.env.ARCJET_ENV === "development";

// Route-level Arcjet client for /api/gen-ai-code only.
// shield + detectBot handled globally in proxy.ts.
// Characteristics: "userId" means each Clerk user gets their own token bucket.
export const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  characteristics: ["userId"],
  rules: [
    // ── Per-user rate limit ────────────────────────────────────────────────
    tokenBucket({
      mode: isDev ? "DRY_RUN" : "LIVE",
      refillRate: 5, // refill 5 tokens every...
      interval: 60, // ...60 seconds
      capacity: 5, // max burst = 5
    }),

    // ── Prompt injection detection ─────────────────────────────────────────
    detectPromptInjection({
      mode: isDev ? "DRY_RUN" : "LIVE",
    }),

    // ── Sensitive information ──────────────────────────────────────────────
    sensitiveInfo({
      mode: isDev ? "DRY_RUN" : "LIVE",
      deny: ["CREDIT_CARD_NUMBER", "API_KEY", "AWS_SECRET_KEY"],
    }),
  ],
});

// Rate limiter for /api/heal: allows up to 10 self-heal runs per minute per user
export const healLimiter = arcjet({
  key: process.env.ARCJET_KEY!,
  characteristics: ["userId"],
  rules: [
    tokenBucket({
      mode: isDev ? "DRY_RUN" : "LIVE",
      refillRate: 10,
      interval: 60,
      capacity: 10,
    }),
  ],
});

// Rate limiter for /api/deploy: allows up to 3 live deploys per minute per user
export const deployLimiter = arcjet({
  key: process.env.ARCJET_KEY!,
  characteristics: ["userId"],
  rules: [
    tokenBucket({
      mode: isDev ? "DRY_RUN" : "LIVE",
      refillRate: 3,
      interval: 60,
      capacity: 3,
    }),
  ],
});
