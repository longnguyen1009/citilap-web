"use client";

import { use } from "react";
import ProductEditor from "@/components/admin/products/ProductEditor";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const { id } = use(params);
  return <ProductEditor id={id} />;
}
