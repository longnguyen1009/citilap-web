'use client';
import { useEffect, useState } from 'react';
import type { MediaAssetDto } from '@/contracts/cms/media';
import { mediaRequest, MediaThumbnail } from '../media/MediaBrowser';
export default function StudioAsset({ id }: { id: string }) {
  const [asset, setAsset] = useState<MediaAssetDto | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { let live = true; mediaRequest<{ asset: MediaAssetDto }>(`/api/admin/media/${encodeURIComponent(id)}`).then(d => { if (live) setAsset(d.asset); }).catch(() => { if (live) setError(true); }); return () => { live = false; }; }, [id]);
  return <div className="studio-asset">{asset ? <><MediaThumbnail asset={asset} /><small>{asset.name}</small></> : <span>{error ? 'Không thể tải media' : 'Đang tải ảnh…'}</span>}</div>;
}
