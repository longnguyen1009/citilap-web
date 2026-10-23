"use client";

import { lazy, Suspense } from "react";
import { useCompare } from "@/context/CompareContext";

const CompareModal = lazy(() => import("./CompareModal"));

export default function LazyCompareModal() {
  const { isCompareOpen } = useCompare();
  return isCompareOpen ? <Suspense fallback={<span role="status">Đang tải so sánh...</span>}>
    <CompareModal />
  </Suspense> : null;
}
