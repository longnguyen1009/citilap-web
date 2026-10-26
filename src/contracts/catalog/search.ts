import { z } from 'zod';

const textList = z.array(z.string().trim().min(1).max(100)).max(20).optional();
const numberList = z.array(z.coerce.number().int().positive().max(1_000_000)).max(20).optional();
const schema = z.object({
  inStock: z.enum(['1','0']).transform(v => v === '1').optional(),
  type: z.string().trim().min(1).max(100).optional(),
  tag: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  subcat: textList,
  query:z.string().max(100).optional(), brand:textList, category:textList, condition:textList,
  cpu:textList, gpu:textList, connection:textList, power:textList, ram:numberList, storage:numberList, year:textList,
  minPrice:z.coerce.number().min(0).max(1_000_000_000).optional(),
  maxPrice:z.coerce.number().min(0).max(1_000_000_000).optional(),
  sort:z.enum(['relevance','price-asc','price-desc','newest','featured','best-selling']).optional(),
  page:z.coerce.number().int().min(1).max(1_000_000).default(1),
  limit:z.coerce.number().int().min(1).max(48).default(12),
}).refine(v=>v.minPrice===undefined || v.maxPrice===undefined || v.minPrice<=v.maxPrice, {message:'Khoảng giá không hợp lệ',path:['maxPrice']});

export function parseSearchParams(params: URLSearchParams) {
  const input:Record<string,unknown> = {};
  for (const key of ['tag','brand','category','subcat','condition','cpu','gpu','connection','power','ram','storage','year']) {
    if (params.has(key)) input[key]=params.getAll(key);
  }
  for (const key of ['minPrice','maxPrice','sort','page','limit','type','inStock']) {
    const value = params.get(key);
    if (value !== null && !(['minPrice','maxPrice','type'].includes(key) && value.trim() === '')) input[key]=value;
  }
  if(params.has('q')) input.query=params.get('q');
  const presets:Record<string,[number|undefined,number|undefined]> = {
    'under-15':[undefined,15000000], '15-20':[15000000,20000000], '20-30':[20000000,30000000], 'over-30':[30000000,undefined],
    'under-15m':[undefined,15000000], '15m-20m':[15000000,20000000], '20m-25m':[20000000,25000000], 'above-30m':[30000000,undefined],
    '20m-30m':[20000000,30000000], 'under-200k':[undefined,200000], '200k-500k':[200000,500000],
    '500k-1m':[500000,1000000], '1m-2m':[1000000,2000000], 'over-2m':[2000000,undefined],
  };
  if(input.minPrice===undefined && input.maxPrice===undefined && params.has('pricePreset')) {
    const range=presets[params.get('pricePreset')!];
    if(range) [input.minPrice,input.maxPrice]=range;
  }
  return schema.safeParse(input);
}
