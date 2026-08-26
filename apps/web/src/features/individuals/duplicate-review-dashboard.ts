import "server-only";

import { listSafeDuplicateReviews } from "./duplicate-review-list";

export type IdentificationDashboardMetrics = {
  totalReviews: number;
  pendingReviews: number;
  completedReviews: number;
  resolutionRate: number;
  highConfidence: number;
  mediumConfidence: number;
  cpfStrategy: number;
  biographicStrategy: number;
  samePerson: number;
  differentPeople: number;
  inconclusive: number;
  sourceRecordsInReview: number;
  generatedAt: string;
};

export async function getIdentificationDashboardMetrics(): Promise<IdentificationDashboardMetrics> {
  const reviews = await listSafeDuplicateReviews("all", 1000);
  const pendingReviews = reviews.filter(
    (review) => review.status === "open",
  ).length;
  const completedReviews = reviews.filter(
    (review) => review.status === "completed",
  ).length;

  return {
    totalReviews: reviews.length,
    pendingReviews,
    completedReviews,
    resolutionRate:
      reviews.length === 0
        ? 0
        : Math.round((completedReviews / reviews.length) * 1000) / 10,
    highConfidence: reviews.filter((review) => review.confidence === "high")
      .length,
    mediumConfidence: reviews.filter((review) => review.confidence === "medium")
      .length,
    cpfStrategy: reviews.filter((review) => review.strategy === "cpf").length,
    biographicStrategy: reviews.filter(
      (review) => review.strategy === "biographic",
    ).length,
    samePerson: reviews.filter((review) => review.decision === "same-person")
      .length,
    differentPeople: reviews.filter(
      (review) => review.decision === "different-people",
    ).length,
    inconclusive: reviews.filter((review) => review.decision === "inconclusive")
      .length,
    sourceRecordsInReview: reviews.reduce(
      (total, review) => total + review.recordCount,
      0,
    ),
    generatedAt: new Date().toISOString(),
  };
}
