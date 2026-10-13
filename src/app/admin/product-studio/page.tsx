import { redirect } from "next/navigation";

interface ProductStudioRedirectProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductStudioRedirectPage({
  searchParams,
}: ProductStudioRedirectProps) {
  const query = await searchParams;
  const id = typeof query.id === "string" ? query.id : undefined;

  if (id) {
    redirect(`/admin/products/${id}`);
  }

  redirect("/admin/products");
}
