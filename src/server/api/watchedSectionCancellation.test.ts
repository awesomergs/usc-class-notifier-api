import assert from "node:assert/strict";
import test from "node:test";
import { TRPCError } from "@trpc/server";
import {
  cancelWatchedSection,
  type WatchedSectionCancellationRepository,
  type WatchedSectionCancellationUpdate,
} from "@/server/api/watchedSectionCancellation";

test("cancels exactly one active watched section owned by the student", async () => {
  const cancelledAt = new Date("2026-08-25T16:00:00.000Z");
  const updates: WatchedSectionCancellationUpdate[] = [];
  const repository: WatchedSectionCancellationRepository = {
    async updateMany(update) {
      updates.push(update);
      return { count: 1 };
    },
  };

  await cancelWatchedSection(repository, "watched-section-id", "student-id", cancelledAt);

  assert.deepEqual(updates, [
    {
      where: {
        id: "watched-section-id",
        studentId: "student-id",
        cancelledAt: null,
      },
      data: {
        cancelledAt,
        notified: true,
      },
    },
  ]);
});

test("reports NOT_FOUND when no active watched section belongs to the student", async () => {
  const repository: WatchedSectionCancellationRepository = {
    async updateMany() {
      return { count: 0 };
    },
  };

  await assert.rejects(
    cancelWatchedSection(repository, "missing-section-id", "student-id", new Date("2026-08-25T16:00:00.000Z")),
    (error) => error instanceof TRPCError && error.code === "NOT_FOUND" && error.message === "Section not found",
  );
});
