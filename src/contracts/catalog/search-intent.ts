export function searchIntent(raw: string) {
  let query = raw.toLowerCase();
  const budget = query.match(/\b(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr)\b/);
  const maxPrice = budget ? Math.round(Number(budget[1].replace(',', '.')) * 1_000_000) : undefined;
  if (maxPrice !== undefined && maxPrice > 0 && maxPrice <= 1_000_000_000) query = query.replace(budget![0], '').replace(/(^|\s)(?:tầm|tam|giá|gia|dưới|duoi|tối đa|toi da)(?=\s|$)/g, ' ');
  query = query.replace(/\b(?:rtx|gtx)\s*(\d{4})\b/g, match => match.replace(/(rtx|gtx)\s*/, '$1 '));
  query = query.replace(/(^|\s)(?:máy tính|may tinh|máy|may|cho|nhu cầu|nhu cau)(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
  // ponytail: deterministic budget and name normalization; add synonyms only from failed-search evidence.
  return { query, maxPrice: maxPrice && maxPrice <= 1_000_000_000 ? maxPrice : undefined };
}
