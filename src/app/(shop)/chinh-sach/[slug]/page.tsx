import { redirect } from "next/navigation";

const redirectMap: Record<string, string> = {
  "bao-hanh": "/chinh-sach-bao-hanh",
  "chinh-sach-bao-hanh": "/chinh-sach-bao-hanh",
  "doi-tra": "/chinh-sach-doi-tra",
  "chinh-sach-doi-tra": "/chinh-sach-doi-tra",
  "giao-hang": "/chinh-sach-van-chuyen",
  "van-chuyen": "/chinh-sach-van-chuyen",
  "chinh-sach-van-chuyen": "/chinh-sach-van-chuyen",
  "privacy": "/chinh-sach-bao-mat",
  "bao-mat": "/chinh-sach-bao-mat",
  "chinh-sach-bao-mat": "/chinh-sach-bao-mat",
  "dieu-khoan": "/dieu-khoan-mua-hang",
  "dieu-khoan-mua-hang": "/dieu-khoan-mua-hang",
  "huong-dan-mua-hang": "/huong-dan-mua-hang",
};

export default async function LegacyPolicyRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const target = redirectMap[slug] || "/huong-dan-mua-hang";
  redirect(target);
}
