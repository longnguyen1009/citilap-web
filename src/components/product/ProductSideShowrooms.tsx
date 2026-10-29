import { MapPin, Phone, Clock, Store } from "lucide-react";
import { businessProfile } from "@/config/business-profile";
import type { PublicStorefrontSettings } from '@/contracts/cms/settings';

export default function ProductSideShowrooms({ settings }: { settings?: PublicStorefrontSettings | null }) {
  const activeLocations = settings ? [
    {id:'hanoi',name:settings.storeName + ' Hà Nội',address:settings.addressHanoi,displayPhone:settings.storePhone,telHref:'tel:'+settings.storePhone.replace(/[^+\d]/g,''),walkInViewingAndPurchaseEnabled:true},
    {id:'bac-ninh',name:settings.storeName + ' Bắc Ninh',address:settings.addressBacNinh,displayPhone:settings.storePhoneBacNinh,telHref:'tel:'+settings.storePhoneBacNinh.replace(/[^+\d]/g,''),walkInViewingAndPurchaseEnabled:false},
  ].filter(location => location.address.trim()) : businessProfile.locations.filter(loc => loc.status === "ACTIVE");

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-5 space-y-3.5">
      <h3 className="text-sm sm:text-base font-black text-gray-900 uppercase flex items-center justify-between pb-2.5 border-b border-gray-100">
        <span className="flex items-center gap-2">
          <Store className="w-4 h-4 text-rose-600" />
          Hệ thống cửa hàng CitiLap
        </span>
        <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold">
          {activeLocations.length} cơ sở
        </span>
      </h3>

      <div className="space-y-2.5 text-xs sm:text-sm">
        {activeLocations.map((loc, idx) => (
          <div
            key={loc.id}
            className="p-3.5 rounded-xl bg-gray-50/70 border border-gray-200/70 hover:border-blue-300 hover:bg-blue-50/20 transition space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <strong className="text-gray-900 font-bold flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
                  {idx + 1}
                </span>
                <span>{loc.name}</span>
              </strong>
              {loc.walkInViewingAndPurchaseEnabled && (
                <span className="text-xs text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded shrink-0">
                  Liên hệ xem máy
                </span>
              )}
            </div>

            <p className="text-gray-600 flex items-start gap-1.5 leading-snug">
              <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
              <span>{loc.address}</span>
            </p>

            <div className="flex items-center justify-between pt-1.5 border-t border-gray-200/50 text-xs">
              <span className="text-gray-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>{settings?.openingHours || 'Liên hệ hẹn trước'}</span>
              </span>
              <a
                href={loc.telHref}
                className="text-blue-600 font-bold hover:underline flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{loc.displayPhone}</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
