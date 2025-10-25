import React from "react";
import { usePlanFeatures } from "../hooks/usePlanFeatures";

type Props = {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export default function FeatureGate({ feature, children, fallback = null }: Props) {
  const { hasFeature, loadingPlan } = usePlanFeatures();
  if (loadingPlan) return null;
  return hasFeature(feature) ? <>{children}</> : <>{fallback}</>;
}


