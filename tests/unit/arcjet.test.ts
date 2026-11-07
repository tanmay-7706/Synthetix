import { describe, it, expect, vi } from "vitest";

// Mock @arcjet/next to inspect options passed to arcjet() and tokenBucket()
const arcjetInvocations: any[] = [];
const tokenBucketInvocations: any[] = [];

vi.mock("@arcjet/next", () => {
  return {
    default: vi.fn((config: any) => {
      arcjetInvocations.push(config);
      return {
        protect: vi.fn().mockResolvedValue({ isDenied: () => false }),
        ...config,
      };
    }),
    tokenBucket: vi.fn((config: any) => {
      tokenBucketInvocations.push(config);
      return { type: "tokenBucket", ...config };
    }),
    detectPromptInjection: vi.fn((config: any) => ({ type: "promptInjection", ...config })),
    sensitiveInfo: vi.fn((config: any) => ({ type: "sensitiveInfo", ...config })),
  };
});

describe("lib/arcjet - Rate limiters configuration", () => {
  it("initializes healLimiter and deployLimiter with user-level characteristics and correct token bucket rates", async () => {
    // Dynamically import lib/arcjet so mocks apply
    const { healLimiter, deployLimiter, aj } = await import("@/lib/arcjet");

    expect(healLimiter).toBeDefined();
    expect(deployLimiter).toBeDefined();
    expect(aj).toBeDefined();

    // Verify user characteristics
    expect((healLimiter as any).characteristics).toEqual(["userId"]);
    expect((deployLimiter as any).characteristics).toEqual(["userId"]);
    expect((aj as any).characteristics).toEqual(["userId"]);

    // Find heal limiter tokenBucket config
    const healBucket = tokenBucketInvocations.find((b) => b.capacity === 10);
    expect(healBucket).toBeDefined();
    expect(healBucket.refillRate).toBe(10);
    expect(healBucket.interval).toBe(60);

    // Find deploy limiter tokenBucket config
    const deployBucket = tokenBucketInvocations.find((b) => b.capacity === 3);
    expect(deployBucket).toBeDefined();
    expect(deployBucket.refillRate).toBe(3);
    expect(deployBucket.interval).toBe(60);

    // Find AI generation limiter config (capacity 5, refillRate 5, interval 60)
    const aiBucket = tokenBucketInvocations.find((b) => b.capacity === 5);
    expect(aiBucket).toBeDefined();
    expect(aiBucket.refillRate).toBe(5);
  });
});
