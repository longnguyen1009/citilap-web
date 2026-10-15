import { permanentRedirect } from "next/navigation";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  permanentRedirect(`/news?category=${encodeURIComponent(slug)}`);
}
