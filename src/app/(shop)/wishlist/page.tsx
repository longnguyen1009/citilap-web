"use client";

import Link from "next/link";
import { Heart, ShoppingCart, ArrowRight } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ProductCard from "@/components/product/ProductCard";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function WishlistPage() {
  const { wishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = (item: (typeof wishlist)[0]) => {
    addToCart({
      id: item.productId,
      productId: item.productId,
      name: item.name,
      price: parseInt(item.price.replace(/\D/g, ""), 10) || 0,
      displayPrice: item.price,
      image: item.image,
      quantity: 1,
    });
  };

  if (wishlist.length === 0) {
    return (
      <div className="bg-surface-subtle min-h-[60vh] flex flex-col items-center justify-center p-4">
        <Container className="max-w-md">
          <EmptyState
            icon={<Heart className="w-10 h-10 text-text-muted" />}
            title="Danh sách yêu thích trống"
            description="Bạn chưa lưu sản phẩm nào vào danh sách yêu thích. Khám phá các mẫu laptop mới nhất tại Citilap ngay hôm nay."
            action={
              <Link href="/">
                <Button
                  variant="primary"
                  size="md"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Tiếp tục mua sắm
                </Button>
              </Link>
            }
          />
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-surface-subtle min-h-screen pb-12">
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: `Yêu thích (${wishlist.length})`, href: "/wishlist" },
        ]}
      />

      <Container className="mt-6">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-border-default">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-text-primary uppercase tracking-tight">
            Danh sách yêu thích ({wishlist.length})
          </h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
          {wishlist.map((item) => (
            <ProductCard
              key={item.productId}
              product={{
                id: item.productId,
                name: item.name,
                price: item.price,
                image: item.image,
              }}
              showSpecs={false}
              footerAction={
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full font-bold"
                  onClick={() => handleAddToCart(item)}
                  leftIcon={<ShoppingCart className="w-4 h-4" />}
                >
                  Thêm vào giỏ
                </Button>
              }
            />
          ))}
        </div>
      </Container>
    </div>
  );
}
