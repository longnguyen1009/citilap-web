/**
 * Google Tag Manager cho storefront (không gắn ở admin).
 * Đặt NEXT_PUBLIC_GTM_ID (vd: GTM-XXXXXXX) để bật; GA4, Facebook Pixel, Zalo... cấu hình trong GTM.
 * Domain tương ứng đã được thêm vào CSP trong next.config.
 */
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim();

export default function Analytics() {
  if (!GTM_ID || !/^GTM-[A-Z0-9]+$/.test(GTM_ID)) return null;
  const snippet = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`;
  return (
    <>
      <script id="gtm-init" dangerouslySetInnerHTML={{ __html: snippet }} />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}

