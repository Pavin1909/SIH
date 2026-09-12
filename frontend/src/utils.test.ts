import { describe, expect, it } from "vitest";
import { verdictTone } from "./utils";

describe("verdictTone", () => {
  it("maps backend verdicts to UI states", () => {
    expect(verdictTone("BENIGN")).toBe("safe");
    expect(verdictTone("SUSPICIOUS")).toBe("suspicious");
    expect(verdictTone("CONFIRMED_MALICIOUS")).toBe("malicious");
  });
});
