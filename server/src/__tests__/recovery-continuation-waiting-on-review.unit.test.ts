import { describe, expect, it } from "vitest";
import { continuationWaitingOnReviewBlockedByIssueIds } from "../services/recovery/service.js";

describe("continuation waiting-on-review blocker reconciliation", () => {
  it("preserves explicit blockers without promoting open children into blockedBy", () => {
    const blockers = continuationWaitingOnReviewBlockedByIssueIds({
      existingBlockerIds: ["explicit-review-blocker", "explicit-review-blocker"],
      openChildIds: ["stale-child-a", "stale-child-b"],
    });

    expect(blockers).toEqual(["explicit-review-blocker"]);
    expect(blockers).not.toContain("stale-child-a");
    expect(blockers).not.toContain("stale-child-b");
  });

  it("does not re-mint stale child blockers after a relation-only de-link", () => {
    const blockers = continuationWaitingOnReviewBlockedByIssueIds({
      existingBlockerIds: [],
      openChildIds: ["tkj-1610", "tkj-2378", "tkj-1621"],
    });

    expect(blockers).toEqual([]);
  });
});
