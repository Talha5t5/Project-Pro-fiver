import { useQuery } from "@tanstack/react-query";

type PlanConfig = {
  planId: number | null;
  features?: {
    limits?: Record<string, number>;
    [key: string]: any;
  };
};

export function usePlanFeatures() {
  const { data, isLoading, isError } = useQuery<PlanConfig>({
    queryKey: ["/api/mobile/plan-configuration"],
    queryFn: async () => {
      const res = await fetch("/api/mobile/plan-configuration", {
        headers: { "x-mobile-session-id": localStorage.getItem("mobileSessionId") || "" },
      });
      if (!res.ok) throw new Error("Failed to load plan configuration");
      return res.json();
    },
    staleTime: 60_000,
  });

  const hasFeature = (id: string, fallback = false): boolean => {
    return (data?.features?.[id] as boolean) ?? fallback;
  };

  const getLimit = (key: string, fallback = -1): number => {
    const val = data?.features?.limits?.[key];
    return typeof val === "number" ? val : fallback;
  };

  return { planConfig: data, loadingPlan: isLoading, planError: isError, hasFeature, getLimit };
}


