export type StorefrontEvent = 'page_view' | 'view_item' | 'search' | 'search_empty' | 'compare' | 'add_to_cart' | 'begin_checkout' | 'order_requested' | 'contact_click' | 'appointment_requested';

export function trackStorefront(event: StorefrontEvent) {
  try {
    if (typeof window === 'undefined' || navigator.doNotTrack === '1' || localStorage.getItem('citilap_metrics_consent') !== 'yes') return;
    // Aggregate event only: no search text, URL, phone, email or visitor identifier.
    void fetch('/api/storefront-metrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event }), keepalive: true }).catch(() => {});
  } catch { /* Analytics must never interrupt buying when storage is blocked. */ }
}
