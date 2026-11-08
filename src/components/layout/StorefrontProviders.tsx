import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { CompareProvider } from '@/context/CompareContext';
import CompareFloatingBar from '@/components/product/CompareFloatingBar';
import LazyCompareModal from '@/components/product/LazyCompareModal';

export default function StorefrontProviders({ children }: { children: React.ReactNode }) {
  return <CartProvider><WishlistProvider><CompareProvider>
    {children}
    <CompareFloatingBar />
    <LazyCompareModal />
  </CompareProvider></WishlistProvider></CartProvider>;
}
