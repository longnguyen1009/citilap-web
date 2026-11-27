import { permanentRedirect } from "next/navigation";
import {
  CUSTOMER_EXPERIENCE_BASE_PATH,
  isCustomerExperienceSlug,
} from "@/lib/customer-experience";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  if (isCustomerExperienceSlug(slug)) {
    permanentRedirect(CUSTOMER_EXPERIENCE_BASE_PATH);
  }
  permanentRedirect(`/news?category=${encodeURIComponent(slug)}`);
}
