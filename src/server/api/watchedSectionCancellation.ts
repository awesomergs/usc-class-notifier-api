import { TRPCError } from "@trpc/server";

export interface WatchedSectionCancellationUpdate {
  where: {
    id: string;
    studentId: string;
    cancelledAt: null;
  };
  data: {
    cancelledAt: Date;
    notified: true;
  };
}

export interface WatchedSectionCancellationRepository {
  updateMany(update: WatchedSectionCancellationUpdate): PromiseLike<{ count: number }>;
}

export async function cancelWatchedSection(
  repository: WatchedSectionCancellationRepository,
  id: string,
  studentId: string,
  cancelledAt = new Date(),
): Promise<void> {
  const result = await repository.updateMany({
    where: {
      id,
      studentId,
      cancelledAt: null,
    },
    data: {
      cancelledAt,
      notified: true,
    },
  });

  if (result.count !== 1) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" });
  }
}
