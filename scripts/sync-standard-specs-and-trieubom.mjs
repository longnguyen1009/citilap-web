// 1. Standardize all existing laptop specs to the exact 17-key CitiLap order (multi-line ports, "-" for missing)
// 2. Crawl/import 200 laptops from trieubom.com (+1,500,000 VND, <= 50M after markup):
//    - Dedupe against existing products: if matched, update price (+1.5M) & 17 specs from trieubom
//    - If new, download & compress images (detail q94 + thumb 480px q70) and publish to local D1 + R2
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync, backup } from 'node:sqlite';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { buildCitiLapContent, productKind } from './lib/citilap-copy.mjs';

const MAX_PRICE = 50_000_000;
const MARKUP = 1_500_000;
const TARGET_TRIEUBOM = 200;
const MEDIA_CACHE = '.wrangler/trieubom-crawl/media-cache';
mkdirSync(MEDIA_CACHE, { recursive: true });

const STANDARD_KEYS = [
  'CPU',
  'RAM',
  'Ổ cứng',
  'Độ phân giải',
  'Card màn hình',
  'Cổng kết nối',
  'Kết nối không dây',
  'Camera',
  'Sạc',
  'Trọng lượng',
  'Kích thước',
  'Bàn phím',
  'Pin',
  'Hệ điều hành',
  'Tình trạng',
  'Chất liệu vỏ',
  'Bảo hành',
];

function decodeEntities(str) {
  return String(str || '')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => {
      const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&times;/gi, 'x')
    .replace(/&Prime;|&rdquo;|&ldquo;/gi, '"')
    .replace(/&ndash;|&mdash;/gi, '-');
}

function stripTagsKeepLines(html) {
  return decodeEntities(
    String(html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|li)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function stripTags(html) {
  return decodeEntities(String(html || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function slugify(str) {
  return decodeEntities(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}

function isBlank(v) {
  const t = String(v || '').trim();
  return !t || /^(?:cập nhật|đang cập nhật|chưa cập nhật|none|n\/a|null|undefined|-|—)$/i.test(t);
}

function formatPortsMultiline(raw) {
  if (isBlank(raw)) return '-';
  let text = String(raw).trim();
  if (text.includes('\n')) {
    return text.split('\n').map((l) => l.trim()).filter(Boolean).join('\n').slice(0, 950);
  }
  // Split concatenated port lists like "1 x HDMI 2.1 2 x USB 3.2" or comma-separated into lines
  text = text
    .replace(/\s+(?=\d+\s*x\s+)/gi, '\n')
    .replace(/,\s*(?=\d+\s*x\s+|USB|HDMI|RJ45|Jack|DC|Thunderbolt|Audio|SD|MicroSD|LAN|Power)/gi, '\n');
  const lines = text.split('\n').map((l) => l.replace(/^[,\s]+|[,\s]+$/g, '').trim()).filter(Boolean);
  return lines.length ? lines.join('\n').slice(0, 950) : '-';
}

function parseTableRows(html) {
  const rows = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html || '')) !== null) {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)];
    if (cells.length >= 2) {
      const key = stripTags(cells[0][1]).replace(/:$/, '').trim();
      const valMulti = stripTagsKeepLines(cells.slice(1).map((c) => c[1]).join('\n'));
      const valSingle = valMulti.replace(/\n+/g, ' ').trim();
      if (key && !isBlank(valSingle)) {
        rows.push({ key, valMulti, valSingle });
      }
    }
  }
  return rows;
}

function extractColorFromRows(rows, name = '') {
  const row = rows.find((r) => /^(?:màu\s*sắc|màu|color)$/i.test(r.key));
  const raw = row?.valSingle || '';
  if (raw && !isBlank(raw)) {
    let c = raw.replace(/^Màu\s+/i, '').trim();
    const paren = c.match(/\(([A-Za-z][A-Za-z0-9\s-]{2,28})\)/);
    if (paren) return paren[1].trim();
    const vnEn = c.match(/^(?:Xám|Đen|Trắng|Bạc|Xanh(?:\s+dương|\s+đen)?|Vàng|Hồng)\s+([A-Z][A-Za-z0-9\s-]{2,28})$/);
    if (vnEn) return vnEn[1].trim();
    const map = { 'xám': 'Grey', 'đen': 'Black', 'trắng': 'White', 'bạc': 'Silver', 'xanh': 'Blue' };
    if (map[c.toLowerCase()]) return map[c.toLowerCase()];
    return c.split(/[,/;]/)[0].trim().slice(0, 24);
  }
  const nm = name.match(/\b(Glacier White|Storm Grey|Luna Grey|Mecha Gray|Eclipse Gray|Shadow Black|Silver|Black|Grey|Gray|White|Blue|Gold)\b/i);
  return nm ? nm[1] : '';
}

function buildStandard17Specs({ existingSpecs = [], rawHtmlRows = [], condition = 'NEW' }) {
  const existingMap = new Map(existingSpecs.map((s) => [s.key.toLowerCase(), s.value]));
  const findExisting = (...keys) => {
    for (const k of keys) {
      const v = existingMap.get(k.toLowerCase());
      if (!isBlank(v)) return String(v).trim();
    }
    return '';
  };
  const findRow = (re, multi = false) => {
    const r = rawHtmlRows.find((x) => re.test(x.key));
    return r ? (multi ? r.valMulti : r.valSingle) : '';
  };

  const cpu = findRow(/^CPU$/i) || [findRow(/^Model$/i), findRow(/Xung nhịp/i)].filter(Boolean).join(' ') || findExisting('CPU');
  const ram = findRow(/^RAM$/i) || [findRow(/^Dung lượng$/i), findRow(/^Công nghệ$/i)].filter(Boolean).join(' ') || findExisting('RAM');
  const ssd = findRow(/^(?:Ổ cứng|Dung lượng SSD)$/i) || findExisting('Ổ cứng', 'SSD');

  const displayFromRows = (() => {
    const direct = findRow(/^(?:Độ phân giải|Màn hình)$/i);
    if (direct && /inch|"|′|″|FHD|WUXGA|WQXGA|QHD|2\.5K|2\.8K|3K|4K|OLED|Retina/i.test(direct)) return direct;
    const parts = [findRow(/^Kích thước$/i), findRow(/^Độ phân giải$/i), findRow(/^tấm nền$/i), findRow(/^Độ phủ màu$/i), findRow(/^Tần số quét$/i)].filter(Boolean);
    return parts.length >= 2 ? parts.join(' · ') : '';
  })();
  const display = displayFromRows || findExisting('Độ phân giải', 'Màn hình');

  const gpu = (() => {
    const direct = findRow(/^(?:Card màn hình|Card đồ họa|VGA|GPU)$/i);
    if (direct) return direct;
    const ded = findRow(/VGA chuyên dụng/i);
    const onb = findRow(/VGA tích hợp/i);
    if (ded && onb) return `${onb} + ${ded}`;
    return ded || onb || findExisting('Card màn hình', 'GPU');
  })();

  const portsRaw = findRow(/^Cổng kết nối$/i, true) ||
    rawHtmlRows.filter((r) => /cổng|usb|hdmi|thunderbolt|jack|lan/i.test(r.key) && !/wi-?fi|bluetooth/i.test(r.key)).map((r) => r.valMulti).join('\n') ||
    findExisting('Cổng kết nối');
  const ports = formatPortsMultiline(portsRaw);

  const wireless = findRow(/^(?:Kết nối không dây|Wifi|Wi-Fi)$/i) ||
    [findRow(/^Wi-?Fi$/i), findRow(/^Bluetooth$/i)].filter(Boolean).join(' + ') ||
    findExisting('Kết nối không dây');
  const camera = findRow(/^(?:Camera|Webcam|Độ phân giải.*cam)/i) ||
    (rawHtmlRows.find((r) => /HD 720P|FHD 1080P|Webcam/i.test(r.valSingle))?.valSingle || '') ||
    findExisting('Camera');
  const charger = findRow(/^(?:Sạc|Adapter|Nguồn|Công suất sạc)$/i) || findExisting('Sạc');
  const weight = findRow(/^(?:Trọng lượng|Khối lượng|Cân nặng)$/i) || findExisting('Trọng lượng');
  const size = findRow(/^Kích thước$/i) && !/inch/i.test(findRow(/^Kích thước$/i)) ? findRow(/^Kích thước$/i) : findExisting('Kích thước');
  const keyboard = findRow(/^(?:Bàn phím|Keyboard|Đèn LED)$/i) || findExisting('Bàn phím');
  const battery = findRow(/^(?:Pin|Battery)$/i) || findExisting('Pin');
  const os = findRow(/^(?:Hệ điều hành|OS)$/i) || findExisting('Hệ điều hành');
  const condText = condition === 'LIKE_NEW' ? 'LikeNew 99%' : 'Mới 100% - FullBox';
  const material = findRow(/^(?:Chất liệu vỏ|Chất liệu|Vỏ máy)$/i) || findExisting('Chất liệu vỏ');
  const warranty = condition === 'LIKE_NEW' ? '3 tháng' : '6 tháng';

  const vals = {
    'CPU': cpu,
    'RAM': ram,
    'Ổ cứng': ssd,
    'Độ phân giải': display,
    'Card màn hình': gpu,
    'Cổng kết nối': ports,
    'Kết nối không dây': wireless,
    'Camera': camera,
    'Sạc': charger,
    'Trọng lượng': weight,
    'Kích thước': size,
    'Bàn phím': keyboard,
    'Pin': battery,
    'Hệ điều hành': os,
    'Tình trạng': condText,
    'Chất liệu vỏ': material,
    'Bảo hành': warranty,
  };

  return STANDARD_KEYS.map((key) => ({
    key,
    value: isBlank(vals[key]) ? '-' : String(vals[key]).trim().slice(0, 950),
  }));
}

function shortCpu(raw) {
  let c = String(raw || '').trim();
  if (isBlank(c)) return '';
  c = c
    .replace(/^CPU\s+/i, '')
    .replace(/\s*\(.*$/g, '')
    .replace(/\s*tốc\s*độ.*$/i, '')
    .replace(/Intel®?\s*Core™?\s*/i, '')
    .replace(/AMD\s*Ryzen™?\s*/i, 'R')
    .replace(/^R\s*(?:AI\s*)?([3579])\s+/i, (_, num) => (/\bAI\b/i.test(c) ? `Ryzen AI ${num} ` : `R${num}-`))
    .replace(/\bRyzen\s+AI\s+([3579])\s+AI\b/i, 'Ryzen AI $1')
    .replace(/\b(Ryzen\s+AI\s+[3579]\s+\S+)\s+AI\b/i, '$1')
    .replace(/^Ryzen\s+([3579])\s+/i, 'R$1-')
    .replace(/^R([3579])-/i, 'R$1-')
    .replace(/Apple\s+/i, '')
    .replace(/\s*\d+-core.*$/i, '')
    .replace(/\s*Gen\s*\d+\w*/i, '')
    .replace(/\s*Processor.*$/i, '')
    .replace(/--+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (/^[3579][\s-]\d/i.test(c)) c = `Core ${c.replace(/\s+/, '-')}`;
  return c.slice(0, 28);
}

function shortRam(raw) {
  const m = String(raw || '').match(/(\d+)\s*GB/i);
  return m ? `${m[1]}GB` : '';
}

function shortSsd(raw) {
  const m = String(raw || '').match(/(\d+(?:\.\d+)?)\s*(TB|GB)/i);
  if (!m) return '';
  const unit = m[2].toUpperCase();
  const num = Number(m[1]);
  if (unit === 'GB' && num === 1024) return '1TB';
  if (unit === 'GB' && num === 2048) return '2TB';
  return `${m[1]}${unit}`;
}

function shortDiscreteGpu(raw) {
  const g = String(raw || '').trim();
  if (isBlank(g)) return '';
  const rtx = g.match(/\b(RTX\s*(?:[A-Z]?\d{3,4}(?:\s*(?:Ti|Super|Ada))?))/i);
  if (rtx) return rtx[1].replace(/\s+/g, ' ').toUpperCase().replace(/\bADA\b/g, 'Ada').replace(/\bTI\b/g, 'Ti').replace(/\bSUPER\b/g, 'Super');
  const gtx = g.match(/\b(GTX\s*\d{3,4}(?:\s*Ti)?)/i);
  if (gtx) return gtx[1].replace(/\s+/g, ' ').toUpperCase();
  const rx = g.match(/\b(RX\s*\d{3,4}[A-Z]*)/i);
  if (rx) return rx[1].replace(/\s+/g, ' ').toUpperCase();
  const quadro = g.match(/\b(Quadro\s*[A-Z0-9]+)/i);
  if (quadro) return quadro[1];
  return '';
}

function shortScreen(displayRaw) {
  const d = String(displayRaw || '').trim();
  let res = 'FHD';
  if (/\b4K\b|UHD|WQUXGA|3840/i.test(d)) res = '4K';
  else if (/\b3\.2K\b/i.test(d)) res = '3.2K';
  else if (/\b3K\b|3072/i.test(d)) res = '3K';
  else if (/\b2\.8K\b|2880/i.test(d)) res = '2.8K';
  else if (/\b2\.5K\b|WQXGA|2560/i.test(d)) res = '2.5K';
  else if (/QHD\+/i.test(d)) res = 'QHD+';
  else if (/\bQHD\b|\b2K\b/i.test(d)) res = '2K';
  else if (/Liquid\s*Retina\s*XDR/i.test(d)) res = 'Retina XDR';
  else if (/Liquid\s*Retina|Retina/i.test(d)) res = 'Retina';
  else if (/WUXGA|FHD\+|1920\s*[*x×]\s*1200/i.test(d)) res = 'FHD+';
  else if (/FHD|1920\s*[*x×]\s*1080/i.test(d)) res = 'FHD';
  else if (/\bHD\b/i.test(d)) res = 'HD';
  const isOled = /\bOLED\b/i.test(d);
  const hz = d.match(/\b(90|120|144|165|180|240|300|360)\s*Hz/i)?.[1];
  return [res, isOled ? 'OLED' : '', hz ? `${hz}Hz` : ''].filter(Boolean).join(' ');
}

function detectBrand(name, cats = []) {
  const s = `${name} ${cats.join(' ')}`.toLowerCase();
  if (/macbook|apple/.test(s)) return 'Apple';
  if (/lenovo|legion|thinkpad|thinkbook|ideapad|xiaoxin|loq|lecoo|yoga/.test(s)) return 'Lenovo';
  if (/asus|rog|tuf|zenbook|vivobook|proart/.test(s)) return 'Asus';
  if (/dell|alienware|xps|precision|latitude|inspiron|vostro/.test(s)) return 'Dell';
  if (/\bhp\b|omnibook|elitebook|probook|victus|omen|zbook|pavilion|envy/.test(s)) return 'HP';
  if (/\bmsi\b|katana|cyborg|crosshair|vector|raider|stealth|titan|prestige|modern|creator/.test(s)) return 'MSI';
  if (/acer|nitro|predator|aspire|swift/.test(s)) return 'Acer';
  if (/gigabyte|aorus|aero/.test(s)) return 'Gigabyte';
  if (/razer/.test(s)) return 'Razer';
  if (/surface|microsoft/.test(s)) return 'Microsoft';
  if (/\blg\b|\bgram\b/.test(s)) return 'LG';
  return 'Lenovo';
}

function resolveCategoryId(name, cats = [], gpuStr = '') {
  const n = `${name} ${cats.join(' ')}`;
  if (/macbook/i.test(n)) return /pro/i.test(n) ? 'taxonomy-macbook-pro' : 'taxonomy-macbook-air';
  // Workstation
  if (/precision|zbook|thinkpad\s*p\d|proart|creator|\baero\b|rtx\s*a\d{3,4}|\d{4}\s*ada/i.test(n)) {
    if (/precision/i.test(n)) return /\b3\d{3}/.test(n) ? 'tax-precision-3000' : /\b7\d{3}/.test(n) ? 'tax-precision-7000' : 'tax-precision-5000';
    if (/thinkpad\s*p/i.test(n)) return /\bp1\b/i.test(n) ? 'tax-thinkpad-p1' : 'tax-thinkpad-p16';
    if (/zbook/i.test(n)) return /fury/i.test(n) ? 'tax-zbook-fury' : /firefly/i.test(n) ? 'tax-zbook-firefly' : 'tax-zbook-studio';
    if (/proart/i.test(n)) return /p16/i.test(n) ? 'tax-proart-p16' : 'tax-proart-px-pz';
    if (/creator/i.test(n)) return /16\s*ai/i.test(n) ? 'tax-creator-16-ai' : 'tax-creator-z16';
    return 'cat-do-hoa';
  }
  // Gaming
  if (/legion|\bloq\b|lecoo|\brog\b|\btuf\b|katana|cyborg|crosshair|vector|raider|stealth|titan|nitro|predator|\bomen\b|victus|alienware|aorus|razer|gaming/i.test(n) || /rtx\s*\d{4}/i.test(gpuStr)) {
    if (/legion/i.test(n)) return /slim/i.test(n) ? 'tax-legion-slim-5' : /legion\s*(pro\s*)?7|y9000/i.test(n) ? 'tax-legion-7' : /pro\s*5|r7000p|y7000p|r9000p/i.test(n) ? 'tax-legion-pro-5' : 'tax-legion-5';
    if (/\bloq\b/i.test(n)) return /essential/i.test(n) ? 'tax-loq-essential' : /15arp|15aph|ryzen/i.test(n) ? 'tax-loq-15arp' : 'tax-loq-15irx';
    if (/lecoo/i.test(n)) return 'taxonomy-lenovo-lecoo-gaming';
    if (/\brog\b/i.test(n)) return /scar/i.test(n) ? 'tax-rog-strix-scar' : /zephyrus/i.test(n) ? 'tax-rog-zephyrus' : /flow/i.test(n) ? 'tax-rog-flow' : 'tax-rog-strix-g';
    if (/\btuf\b/i.test(n)) return /a14|fa401/i.test(n) ? 'tax-tuf-a14' : /f15|f16|fx50|fx60/i.test(n) ? 'tax-tuf-f15-f16' : 'tax-tuf-a15';
    if (/\bomen\b/i.test(n)) return 'taxonomy-hp-omen';
    if (/victus/i.test(n)) return 'taxonomy-hp-victus';
    if (/nitro/i.test(n)) return /nitro\s*16/i.test(n) ? 'tax-nitro-16' : 'tax-nitro-v';
    if (/predator/i.test(n)) return 'taxonomy-acer-predator';
    if (/katana/i.test(n)) return 'tax-katana-15';
    if (/cyborg/i.test(n)) return 'tax-cyborg-15';
    const b = detectBrand(name, cats).toLowerCase();
    return ({ lenovo: 'tax-gaming-lenovo', asus: 'tax-gaming-asus', msi: 'tax-gaming-msi', acer: 'tax-gaming-acer', hp: 'tax-gaming-hp', dell: 'tax-gaming-dell', gigabyte: 'tax-gaming-gigabyte', razer: 'tax-gaming-razer' })[b] || 'cat-gaming';
  }
  // Office
  if (/thinkbook/i.test(n)) return /\b16/i.test(n) ? 'tax-thinkbook-16' : 'tax-thinkbook-14';
  if (/thinkpad/i.test(n)) return /x1/i.test(n) ? 'tax-thinkpad-x1' : /\bt1[46]/i.test(n) ? 'tax-thinkpad-t' : 'tax-thinkpad-e';
  if (/ideapad|xiaoxin/i.test(n)) return /slim\s*5|pro|xiaoxin/i.test(n) ? 'tax-ideapad-slim-5' : 'tax-ideapad-slim-3';
  if (/\byoga\b/i.test(n)) return /2-in-1|2in1|book|flip/i.test(n) ? 'tax-yoga-2in1' : 'tax-yoga-slim';
  if (/zenbook/i.test(n)) return /duo/i.test(n) ? 'tax-zenbook-duo' : /\bs\s*1[46]|a14/i.test(n) ? 'tax-zenbook-s' : 'tax-zenbook-14';
  if (/vivobook/i.test(n)) return /oled|\bs\s*1[46]/i.test(n) ? 'tax-vivobook-s-oled' : /16/i.test(n) ? 'tax-vivobook-16' : /14/i.test(n) ? 'tax-vivobook-14' : 'tax-vivobook-15';
  if (/elitebook|probook/i.test(n)) return 'taxonomy-hp-elitebook';
  if (/omnibook/i.test(n)) return /flip/i.test(n) ? 'tax-omnibook-flip' : 'tax-omnibook-x';
  if (/inspiron/i.test(n)) return /14/i.test(n) ? 'tax-inspiron-14' : 'tax-inspiron-15';
  if (/\bxps\b/i.test(n)) return /13/i.test(n) ? 'tax-xps-13' : 'tax-xps-14-16';
  if (/latitude/i.test(n)) return 'taxonomy-dell-latitude';
  if (/surface/i.test(n)) return /pro/i.test(n) ? 'tax-surface-pro' : 'tax-surface-laptop';
  const b = detectBrand(name, cats).toLowerCase();
  return ({ lenovo: 'tax-office-lenovo', asus: 'tax-office-asus', dell: 'tax-office-dell', hp: 'tax-office-hp', msi: 'tax-office-msi', acer: 'tax-office-acer' })[b] || 'cat-van-phong';
}

function cleanTrieubomBaseModel(rawName) {
  let s = decodeEntities(rawName)
    .replace(/^\[[^\]]+\]\s*/g, '')
    .replace(/^Laptop\s+(?:Gaming\s+|Workstation\s+)?/i, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*(?:\/|\||–|-)\s*(?:Core|Ultra|Intel|AMD|Ryzen|R[3579]|i[3579]|RTX|GTX|RAM|SSD|\d+\s*GB|\d+\s*TB).*$/i, '')
    .replace(/\b(?:Core\s*(?:Ultra\s*)?[3579][-\s]\S+|Intel\s+Core\s+\S+|i[3579][-\s]\d+\w*|Ryzen\s*(?:AI\s*)?[3579]\s*\S+|R[3579][-\s]\d+\w*|RTX\s*\d{4}\w*(?:\s*\d+GB)?|\d+GB\s*(?:RAM|SSD|DDR\d)?|\d+TB\s*(?:SSD)?)\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/[\s/|-]+$/g, '')
    .trim();
  return s || decodeEntities(rawName).slice(0, 50);
}

function fingerprint(brand, baseModel, cpu, ram, ssd, gpu) {
  const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const modelKey = norm(baseModel).replace(norm(brand), '').slice(0, 18);
  const cpuCode = (String(cpu || '').match(/\d{3,5}[a-z]{0,3}/i)?.[0] || norm(cpu)).toLowerCase();
  return [norm(brand), modelKey, cpuCode, norm(ram), norm(ssd), norm(gpu)].join('|');
}

async function compressImage(buf) {
  const detail = await sharp(buf, { failOn: 'none' }).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 94, smartSubsample: true }).toBuffer();
  const thumb = await sharp(buf, { failOn: 'none' }).rotate().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 70 }).toBuffer();
  const meta = await sharp(detail).metadata();
  return { detail, thumb, width: meta.width || null, height: meta.height || null };
}

async function downloadImage(url) {
  const hash = createHash('sha256').update(url).digest('hex');
  const file = `${MEDIA_CACHE}/${hash}.bin`;
  if (existsSync(file)) return readFileSync(file);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  assert(buf.length > 500 && buf.length <= 10 * 1024 * 1024, `Invalid image size ${buf.length}`);
  writeFileSync(file, buf);
  return buf;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const d1Root = realpathSync('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const dbFile = readdirSync(d1Root).filter((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite').find((f) => {
  const t = new DatabaseSync(resolve(d1Root, f), { readOnly: true });
  try { return !!t.prepare("SELECT 1 FROM sqlite_master WHERE name='ProductStudio'").get(); } finally { t.close(); }
});
const db = new DatabaseSync(resolve(d1Root, dbFile));
mkdirSync('.wrangler/backups', { recursive: true });
const backupPath = resolve('.wrangler/backups', `before-trieubom-${Date.now()}.sqlite`);
await backup(db, backupPath);
console.log('Backup created:', backupPath);
db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000');

const token = randomUUID();
const mf = new Miniflare({
  ...convertV4MiniflareOptions({
    host: '127.0.0.1',
    modules: true,
    bindings: { IMPORT_TOKEN: token },
    script: String.raw`export default {async fetch(r,e){
      if(r.headers.get('Authorization') !== 'Bearer '+e.IMPORT_TOKEN) return new Response(null,{status:403});
      const key=new URL(r.url).searchParams.get('key');
      if(!key) return new Response(null,{status:400});
      if(r.method==='PUT'){await e.PRODUCT_MEDIA.put(key,r.body,{httpMetadata:{contentType:r.headers.get('Content-Type')}});return new Response(null,{status:204});}
      return new Response(null,{status:405});
    }}`,
    compatibilityDate: '2026-10-01',
    r2Buckets: { PRODUCT_MEDIA: 'citilap-media-dev' },
  }),
  resourcePersistencePath: resolve('.wrangler/state/v3'),
});

const r2Put = async (key, body) => {
  const res = await mf.dispatchFetch('http://localhost/?key=' + encodeURIComponent(key), {
    method: 'PUT', body, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'image/webp' },
  });
  assert(res.ok, `R2 PUT ${key}: ${res.status}`);
};

try {
  // Load laptopnew raw data to enrich existing laptops with full 17 specs
  const ltnAll = JSON.parse(readFileSync('.wrangler/laptopnew-crawl/products-all.json', 'utf8'));
  const ltnByAlias = new Map(ltnAll.map((p) => [p.alias.replace(/^copy-of-/i, ''), p]));

  const cats = db.prepare('SELECT id, slug, name, parentId FROM Category').all();
  const catById = new Map(cats.map((c) => [c.id, c]));
  const catPath = (id) => {
    const out = [];
    let c = catById.get(id);
    while (c) { out.unshift(c.slug); c = c.parentId ? catById.get(c.parentId) : null; }
    return '/' + out.join('/');
  };
  const rootCatId = (id) => {
    let c = catById.get(id);
    while (c?.parentId) c = catById.get(c.parentId);
    return c?.id || id;
  };
  const brandByLower = new Map(db.prepare('SELECT id, name, slug FROM Brand').all().flatMap((b) => [[b.name.toLowerCase(), b.id], [b.slug.toLowerCase(), b.id]]));
  const warehouse = db.prepare("SELECT id FROM Warehouse WHERE status='ACTIVE' ORDER BY id LIMIT 1").get();
  assert(warehouse, 'Need active warehouse');

  // STEP 1: Standardize 17 specs on ALL existing laptops in local D1
  const existingRows = db.prepare(`
    SELECT p.id, p.slug, p.name, p.brand, p.price, p.condition, p.categoryId, s.draft, s.published, s.revision
    FROM Product p JOIN ProductStudio s ON s.productId=p.id
    WHERE p.deletedAt IS NULL
  `).all();

  const existingByFp = new Map();
  const existingSlugs = new Set(existingRows.map((r) => r.slug));
  const existingIds = new Set(existingRows.map((r) => r.id));
  const seenSkus = new Set(db.prepare('SELECT sku FROM ProductVariant').all().map((r) => r.sku));

  db.exec('BEGIN IMMEDIATE');
  let standardizedCount = 0;
  try {
    for (const r of existingRows) {
      const doc = JSON.parse(r.published || r.draft);
      if (doc.template !== 'LAPTOP') continue;
      const raw = ltnByAlias.get(r.slug);
      const rawRows = raw ? parseTableRows(raw.content || '') : [];
      const stdSpecs = buildStandard17Specs({ existingSpecs: doc.specs || [], rawHtmlRows: rawRows, condition: doc.condition || r.condition || 'NEW' });
      const specObj = Object.fromEntries(stdSpecs.map((s) => [s.key, s.value]));

      doc.specs = stdSpecs;
      const json = JSON.stringify(doc);
      const nextRev = r.revision + 1;
      db.prepare("INSERT INTO ProductStudioRevision(productId,revision,document,action,actor) VALUES(?,?,?,'publish','std-17-specs')").run(r.id, nextRev, json);
      db.prepare('UPDATE ProductStudio SET draft=?,published=?,revision=?,publishedRevision=?,updatedAt=CURRENT_TIMESTAMP WHERE productId=?').run(json, json, nextRev, nextRev, r.id);
      db.prepare('UPDATE Product SET specs=?,cpu=?,gpu=?,ram=?,storage=?,display=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?')
        .run(JSON.stringify(specObj), specObj.CPU, specObj['Card màn hình'], specObj.RAM, specObj['Ổ cứng'], specObj['Độ phân giải'], r.id);
      standardizedCount++;

      const baseModel = r.name.replace(/^\[[^\]]+\]\s*/i, '').split('|')[0].trim();
      const fp = fingerprint(doc.brand || r.brand, baseModel, shortCpu(specObj.CPU), shortRam(specObj.RAM), shortSsd(specObj['Ổ cứng']), shortDiscreteGpu(specObj['Card màn hình']));
      if (!existingByFp.has(fp)) existingByFp.set(fp, { id: r.id, slug: r.slug, revision: nextRev, doc });
    }
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  console.log(`Standardized 17 specs on ${standardizedCount} existing laptops`);

  // STEP 2: Pick 200 valid laptops from trieubom.com (price + 1.5M <= 50M, has images & spec table)
  const tbAll = JSON.parse(readFileSync('.wrangler/trieubom-crawl/products.json', 'utf8'));
  const excludeCats = /linh tinh|tablet|màn hình|ghế massage|phụ kiện|linh kiện/i;
  const tbCandidates = tbAll.filter((p) => {
    const catNames = (p.categories || []).map((c) => c.name).join(' ');
    if (excludeCats.test(catNames)) return false;
    if (/màn hình|ghế|tablet|ipad|tai nghe|chuột|bàn phím|balo|túi|sạc|hub|ram laptop|ổ cứng/i.test(p.name) && !/laptop|thinkpad|legion|loq|lecoo|tuf|rog|zenbook|vivobook|thinkbook|xiaoxin|yoga|elitebook|omen|zbook/i.test(p.name)) return false;
    const basePrice = Number(p.prices?.price || 0);
    return basePrice >= 5_000_000 && basePrice + MARKUP <= MAX_PRICE && (p.images || []).length > 0 && /<table/i.test(p.description || '');
  });

  // Prioritize the user's example product first, then take up to 200
  tbCandidates.sort((a, b) => {
    const aEx = a.slug === 'lecoo-gt-16-core-5-205h-rtx-3050-4gb-16gb-ram-512gb-ssd' ? -1 : 0;
    const bEx = b.slug === 'lecoo-gt-16-core-5-205h-rtx-3050-4gb-16gb-ram-512gb-ssd' ? -1 : 0;
    return aEx - bEx;
  });
  const selectedTb = tbCandidates.slice(0, TARGET_TRIEUBOM);
  console.log(`Selected ${selectedTb.length} trieubom laptops (from ${tbCandidates.length} eligible)`);

  // Pre-download & upload images for NEW trieubom products (max 4 gallery images per new product)
  const toUpdate = [];
  const toCreate = [];
  for (const p of selectedTb) {
    const catNames = (p.categories || []).map((c) => c.name);
    const rows = parseTableRows(p.description || '');
    const condRow = rows.find((x) => /^Tình trạng$/i.test(x.key))?.valSingle || '';
    const isLikeNew = /like\s*new|likenew|99%|cũ|openbox/i.test(`${p.name} ${condRow}`);
    const condition = isLikeNew ? 'LIKE_NEW' : 'NEW';
    const stdSpecs = buildStandard17Specs({ rawHtmlRows: rows, condition });
    const specObj = Object.fromEntries(stdSpecs.map((s) => [s.key, s.value]));

    const brand = detectBrand(p.name, catNames);
    const baseModel = cleanTrieubomBaseModel(p.name);
    const cpu = shortCpu(specObj.CPU);
    const ram = shortRam(specObj.RAM) || shortRam(p.name) || '16GB';
    const ssd = shortSsd(specObj['Ổ cứng']) || shortSsd(p.name) || '512GB';
    const gpu = shortDiscreteGpu(specObj['Card màn hình']);
    const screen = shortScreen(specObj['Độ phân giải']);
    const color = extractColorFromRows(rows, p.name);
    const condTag = condition === 'LIKE_NEW' ? '[LikeNew]' : '[New 100%]';
    const formattedName = [`${condTag} ${baseModel}`, cpu, ram, ssd, gpu, [screen, color].filter(Boolean).join(' ')].filter(Boolean).join(' | ').slice(0, 160);

    const price = Number(p.prices.price) + MARKUP;
    const regRaw = Number(p.prices.regular_price || 0);
    const originalPrice = regRaw > Number(p.prices.price) ? regRaw + MARKUP : null;

    const fp = fingerprint(brand, baseModel, cpu, ram, ssd, gpu);
    const existing = existingByFp.get(fp);
    if (existing) {
      toUpdate.push({ existing, p, stdSpecs, specObj, condition, formattedName, price, originalPrice, ram, ssd, gpu });
    } else {
      toCreate.push({ p, catNames, stdSpecs, specObj, brand, condition, formattedName, price, originalPrice, ram, ssd, gpu });
      // Also register fingerprint so trieubom doesn't insert duplicate of itself
      existingByFp.set(fp, { id: '__pending__' });
    }
  }
  console.log(`Trieubom dedupe: ${toUpdate.length} matched existing (will update price & specs), ${toCreate.length} new products to create`);

  // Upload images for new products (compressed detail q94 + thumb 480px q70)
  const urlToAsset = new Map();
  const imgUrls = [...new Set(toCreate.flatMap((x) => (x.p.images || []).slice(0, 4).map((i) => i.src).filter((u) => /^https?:\/\//i.test(u))))];
  console.log(`Uploading ${imgUrls.length} unique images for ${toCreate.length} new trieubom laptops...`);

  const uploadedAssets = [];
  for (let i = 0; i < imgUrls.length; i += 10) {
    const chunk = imgUrls.slice(i, i + 10);
    await Promise.all(chunk.map(async (url) => {
      try {
        const orig = await downloadImage(url);
        const { detail, thumb, width, height } = await compressImage(orig);
        const assetId = randomUUID();
        const storageKey = `library/products/${assetId}.webp`;
        await r2Put(storageKey, detail);
        await r2Put(`library/${assetId}_thumb-v2.webp`, thumb);
        const rawName = (url.split('/').pop()?.split('?')[0] || 'laptop.webp').replace(/trieubom/gi, 'citilap').replace(/\.[a-z0-9]+$/i, '') + '.webp';
        uploadedAssets.push({ assetId, storageKey, name: rawName.slice(0, 180), size: detail.length, width, height });
        urlToAsset.set(url, { assetId, storageKey, url: `/api/library/${assetId}`, size: detail.length, width, height });
      } catch (err) {
        console.warn('Skip image:', url, String(err));
      }
    }));
    if ((i + chunk.length) % 100 === 0 || i + chunk.length >= imgUrls.length) {
      console.log(`Uploaded ${Math.min(i + chunk.length, imgUrls.length)}/${imgUrls.length} images`);
    }
  }

  db.exec('BEGIN IMMEDIATE');
  let updatedCount = 0;
  let createdCount = 0;
  try {
    // Insert MediaAsset rows
    for (const a of uploadedAssets) {
      db.prepare(`INSERT INTO MediaAsset(id,kind,provider,storageKey,folder,name,mimeType,size,width,height,state)
        VALUES(?,'IMAGE','R2',?,'products',?,'image/webp',?,?,?,'READY')`)
        .run(a.assetId, a.storageKey, a.name, a.size, a.width, a.height);
    }

    // Apply updates for duplicate products (update price +1.5M & 17 specs from trieubom)
    for (const u of toUpdate) {
      if (u.existing.id === '__pending__') continue;
      const doc = { ...u.existing.doc };
      doc.specs = u.stdSpecs;
      doc.price = u.price;
      doc.originalPrice = u.originalPrice;
      doc.condition = u.condition;
      doc.warrantyMonths = u.condition === 'LIKE_NEW' ? 3 : 6;
      doc.warranties = u.condition === 'LIKE_NEW'
        ? [
            { name: 'Bảo hành 3 tháng', description: '', adjustment: 0, recommended: true, type: 'SHOP', months: 3 },
            { name: 'Bảo hành mở rộng 6 tháng', description: '', adjustment: 300000, recommended: false, type: 'SHOP', months: 6 },
          ]
        : [
            { name: 'Bảo hành 6 tháng', description: '', adjustment: 0, recommended: true, type: 'SHOP', months: 6 },
            { name: 'Bảo hành mở rộng 12 tháng', description: '', adjustment: 500000, recommended: false, type: 'SHOP', months: 12 },
          ];
      if (doc.variants?.length) {
        doc.variants[0] = { ...doc.variants[0], price: u.price, originalPrice: u.originalPrice, condition: u.condition };
      }
      const nextRev = u.existing.revision + 1;
      const json = JSON.stringify(doc);
      db.prepare("INSERT INTO ProductStudioRevision(productId,revision,document,action,actor) VALUES(?,?,?,'publish','trieubom-merge')").run(u.existing.id, nextRev, json);
      db.prepare('UPDATE ProductStudio SET draft=?,published=?,revision=?,publishedRevision=?,updatedAt=CURRENT_TIMESTAMP WHERE productId=?').run(json, json, nextRev, nextRev, u.existing.id);
      db.prepare('UPDATE Product SET price=?,originalPrice=?,condition=?,specs=?,cpu=?,gpu=?,ram=?,storage=?,display=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?')
        .run(u.price, u.originalPrice, u.condition, JSON.stringify(u.specObj), u.specObj.CPU, u.specObj['Card màn hình'], u.specObj.RAM, u.specObj['Ổ cứng'], u.specObj['Độ phân giải'], u.existing.id);
      if (doc.variants?.[0]?.id) {
        db.prepare('UPDATE ProductVariant SET price=?,originalPrice=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?')
          .run(u.price, u.originalPrice, doc.variants[0].id);
      }
      updatedCount++;
    }

    // Create new products from trieubom
    for (const item of toCreate) {
      const media = [];
      for (const img of (item.p.images || []).slice(0, 4)) {
        const info = urlToAsset.get(img.src);
        if (info && !media.some((m) => m.assetId === info.assetId)) {
          media.push({ assetId: info.assetId, alt: item.formattedName.slice(0, 280), variantId: '', info });
        }
      }
      if (!media.length) continue;

      let baseSlug = slugify(item.p.slug || item.formattedName);
      if (!baseSlug) baseSlug = `laptop-tb-${item.p.id}`;
      let slug = baseSlug, k = 2;
      while (existingSlugs.has(slug)) slug = `${baseSlug.slice(0, 125)}-${k++}`;
      existingSlugs.add(slug);

      let id = `tb-${slug}`.slice(0, 56);
      let ik = 2;
      while (existingIds.has(id)) id = `tb-${slug.slice(0, 48)}-${ik++}`;
      existingIds.add(id);
      const categoryId = resolveCategoryId(item.p.name, item.catNames, item.specObj['Card màn hình']);
      const brandId = brandByLower.get(item.brand.toLowerCase()) || null;
      const optName = `${item.ram} / ${item.ssd}`;
      let sku = `CTL-TB-${item.p.id}-1`;
      let sk = 2;
      while (seenSkus.has(sku)) sku = `CTL-TB-${item.p.id}-${sk++}`;
      seenSkus.add(sku);

      const variantId = `${id}-v1`;
      const variant = {
        id: variantId,
        name: optName,
        sku,
        condition: item.condition,
        price: item.price,
        originalPrice: item.originalPrice,
        stock: 10,
        availability: 'AVAILABLE',
        ram: item.specObj.RAM !== '-' ? item.specObj.RAM : item.ram,
        storage: item.specObj['Ổ cứng'] !== '-' ? item.specObj['Ổ cứng'] : item.ssd,
        gpu: item.specObj['Card màn hình'] !== '-' ? item.specObj['Card màn hình'] : undefined,
        options: { 'Cấu hình': optName },
      };

      const warranties = item.condition === 'LIKE_NEW'
        ? [
            { name: 'Bảo hành 3 tháng', description: '', adjustment: 0, recommended: true, type: 'SHOP', months: 3 },
            { name: 'Bảo hành mở rộng 6 tháng', description: '', adjustment: 300000, recommended: false, type: 'SHOP', months: 6 },
          ]
        : [
            { name: 'Bảo hành 6 tháng', description: '', adjustment: 0, recommended: true, type: 'SHOP', months: 6 },
            { name: 'Bảo hành mở rộng 12 tháng', description: '', adjustment: 500000, recommended: false, type: 'SHOP', months: 12 },
          ];

      const rootId = rootCatId(categoryId);
      const tags = [item.brand.toLowerCase(), (catById.get(categoryId)?.name || 'laptop').toLowerCase()];
      if (rootId === 'cat-gaming') tags.push('gaming');
      else if (rootId === 'cat-do-hoa') tags.push('do-hoa');
      else tags.push('van-phong');

      const description = `${item.formattedName}. Chính hãng tại CitiLap, bảo hành ${item.condition === 'LIKE_NEW' ? '3' : '6'} tháng, lỗi 1 đổi 1 trong 7 ngày.`.slice(0, 400);
      const contentHtml = buildCitiLapContent({
        name: item.formattedName,
        brand: item.brand,
        kind: productKind(rootId, 'LAPTOP'),
        specs: item.stdSpecs,
        catPath: catPath(categoryId),
        catName: catById.get(categoryId)?.name || 'Laptop',
        variantCount: 1,
      });

      const doc = {
        schemaVersion: 1,
        name: item.formattedName,
        slug,
        categoryId,
        brand: item.brand,
        brandId,
        template: 'LAPTOP',
        condition: item.condition,
        warrantyType: 'SHOP',
        warrantyMonths: item.condition === 'LIKE_NEW' ? 3 : 6,
        stock: 10,
        isNewArrival: createdCount % 4 === 0,
        isBestSeller: createdCount % 5 === 0,
        isFeatured: createdCount % 6 === 0,
        isFlashSale: false,
        tags: [...new Set(tags)],
        description,
        contentHtml,
        price: item.price,
        originalPrice: item.originalPrice,
        availability: 'AVAILABLE',
        seoTitle: `${item.formattedName} | CitiLap.vn`.slice(0, 120),
        seoDescription: description.slice(0, 280),
        specs: item.stdSpecs,
        media: media.map(({ assetId, alt, variantId: vid }) => ({ assetId, alt, variantId: vid })),
        variants: [variant],
        warranties,
        faqs: [],
        gifts: ['Tặng túi chống sốc CitiLap & chuột không dây', 'Hỗ trợ cài đặt phần mềm & vệ sinh máy trọn đời'],
        accessoryProductIds: [],
        relatedProductIds: [],
      };
      const json = JSON.stringify(doc);

      const ramGb = parseInt(item.ram, 10) || null;
      const storageGb = /TB/i.test(item.ssd) ? Math.round(parseFloat(item.ssd) * 1024) : (parseInt(item.ssd, 10) || null);
      const screenSize = parseFloat(String(item.specObj['Độ phân giải']).match(/(\d+(?:\.\d+)?)\s*(?:inch|"|″)/i)?.[1] || '') || null;
      const refreshRate = parseInt(String(item.specObj['Độ phân giải']).match(/(\d{2,3})\s*Hz/i)?.[1] || '', 10) || null;

      db.prepare(`INSERT INTO Product(
        id,name,slug,description,shortDescription,contentHtml,brand,brandId,condition,
        seoTitle,seoDescription,isFeatured,isNewArrival,isFlashSale,isBestSeller,
        price,originalPrice,images,stock,status,cpu,gpu,ram,ramGb,storage,storageGb,display,screenSize,refreshRate,
        specs,tags,categoryId,inventoryType,createdAt,updatedAt
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,10,'ACTIVE',?,?,?,?,?,?,?,?,?,?,?,?,'QUANTITY',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).run(
        id, item.formattedName, slug, description, description, contentHtml, item.brand, brandId, item.condition,
        doc.seoTitle, doc.seoDescription, doc.isFeatured ? 1 : 0, doc.isNewArrival ? 1 : 0, doc.isBestSeller ? 1 : 0,
        item.price, item.originalPrice, JSON.stringify(media.map((m) => m.info.url)),
        item.specObj.CPU, item.specObj['Card màn hình'], item.specObj.RAM, ramGb, item.specObj['Ổ cứng'], storageGb,
        item.specObj['Độ phân giải'], screenSize, refreshRate,
        JSON.stringify(item.specObj), JSON.stringify(doc.tags), categoryId
      );

      db.prepare(`INSERT INTO ProductVariant(id,productId,sku,name,options,price,originalPrice,stock,status,cpu,gpu,ram,storage,display,createdAt,updatedAt)
        VALUES(?,?,?,?,?,?,?,10,'ACTIVE',?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).run(
        variantId, id, sku, optName, JSON.stringify(variant.options), item.price, item.originalPrice,
        item.specObj.CPU, item.specObj['Card màn hình'], variant.ram, variant.storage, item.specObj['Độ phân giải']
      );

      db.prepare('INSERT INTO ProductStudio(productId,draft,published,revision,updatedAt) VALUES(?,?,?,0,CURRENT_TIMESTAMP)').run(id, json, json);
      db.prepare("INSERT INTO ProductStudioRevision(productId,revision,document,action,actor) VALUES(?,1,?,'publish','trieubom-import')").run(id, json);
      db.prepare('UPDATE ProductStudio SET revision=1,publishedRevision=1,updatedAt=CURRENT_TIMESTAMP WHERE productId=?').run(id);

      for (const [mIdx, m] of media.entries()) {
        db.prepare(`INSERT INTO ProductImage(id,productId,r2Key,url,mimeType,size,width,height,alt,sortOrder,isPrimary,createdAt)
          VALUES(?,?,?,?,'image/webp',?,?,?,?,?,?,CURRENT_TIMESTAMP)`).run(
          randomUUID(), id, m.info.storageKey, m.info.url, m.info.size, m.info.width, m.info.height, m.alt, mIdx, mIdx === 0 ? 1 : 0
        );
        db.prepare("INSERT OR IGNORE INTO MediaUsage(id,assetId,ownerType,ownerId,slot) VALUES(?,?,'PRODUCT_REVISION',?,?)")
          .run(randomUUID(), m.assetId, id, `1:${m.assetId}`);
      }

      db.prepare(`INSERT INTO InventoryBalance(id,warehouseId,productId,variantId,onHand,reserved,updatedAt)
        VALUES(?,?,?,?,10,0,CURRENT_TIMESTAMP)`).run(randomUUID(), warehouse.id, id, variantId);

      createdCount++;
    }

    db.exec('DELETE FROM SearchResultItem; DELETE FROM SearchResultSet; UPDATE SearchCatalogRevision SET revision = revision + 1 WHERE id = 1;');
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }

  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [], 'Foreign key check failed');
  console.log('=== TRIEUBOM SYNC COMPLETE ===', {
    standardizedExisting: standardizedCount,
    trieubomMatchedUpdated: updatedCount,
    trieubomCreated: createdCount,
    totalProducts: db.prepare('SELECT count(*) n FROM Product WHERE deletedAt IS NULL').get().n,
    totalMedia: db.prepare('SELECT count(*) n FROM MediaAsset').get().n,
    unusedMedia: db.prepare('SELECT count(*) n FROM MediaAsset WHERE id NOT IN (SELECT assetId FROM MediaUsage)').get().n,
  });
  const ex = db.prepare("SELECT name, price, specs FROM Product WHERE slug LIKE '%lecoo-gt-16%' LIMIT 1").get();
  if (ex) console.log('Example Lecoo GT 16:', ex.name, ex.price, JSON.parse(ex.specs));
} finally {
  await mf.dispose();
  db.close();
}
