export interface VietQrBankInfo {
  code: string;
  bin: string;
  shortName: string;
  name: string;
}

export const VIETQR_BANKS: readonly VietQrBankInfo[] = [
  { code: "VCB", bin: "970436", shortName: "Vietcombank", name: "Ngân hàng TMCP Ngoại thương Việt Nam" },
  { code: "TCB", bin: "970407", shortName: "Techcombank", name: "Ngân hàng TMCP Kỹ thương Việt Nam" },
  { code: "MB", bin: "970422", shortName: "MB Bank", name: "Ngân hàng TMCP Quân đội" },
  { code: "ICB", bin: "970415", shortName: "VietinBank", name: "Ngân hàng TMCP Công thương Việt Nam" },
  { code: "BIDV", bin: "970418", shortName: "BIDV", name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam" },
  { code: "ACB", bin: "970416", shortName: "ACB", name: "Ngân hàng TMCP Á Châu" },
  { code: "VPB", bin: "970432", shortName: "VPBank", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng" },
  { code: "TPB", bin: "970423", shortName: "TPBank", name: "Ngân hàng TMCP Tiên Phong" },
  { code: "STB", bin: "970403", shortName: "Sacombank", name: "Ngân hàng TMCP Sài Gòn Thương Tín" },
  { code: "VBA", bin: "970405", shortName: "Agribank", name: "Ngân hàng NN&PTNT Việt Nam" },
  { code: "HDB", bin: "970437", shortName: "HDBank", name: "Ngân hàng TMCP Phát triển TP.HCM" },
  { code: "VIB", bin: "970441", shortName: "VIB", name: "Ngân hàng TMCP Quốc tế Việt Nam" },
  { code: "SHB", bin: "970443", shortName: "SHB", name: "Ngân hàng TMCP Sài Gòn - Hà Nội" },
  { code: "MSB", bin: "970426", shortName: "MSB", name: "Ngân hàng TMCP Hàng Hải Việt Nam" },
  { code: "OCB", bin: "970448", shortName: "OCB", name: "Ngân hàng TMCP Phương Đông" },
  { code: "SEAB", bin: "970440", shortName: "SeABank", name: "Ngân hàng TMCP Đông Nam Á" },
  { code: "EIB", bin: "970431", shortName: "Eximbank", name: "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam" },
  { code: "LPB", bin: "970449", shortName: "LPBank", name: "Ngân hàng TMCP Lộc Phát Việt Nam" },
] as const;

export interface VietQrSnapshot {
  bankBin: string;
  accountNumber: string;
  accountName: string;
}

export function findVietQrBank(bankBinOrCode: string): VietQrBankInfo | undefined {
  const normalized = bankBinOrCode.trim().toUpperCase();
  if (!normalized) return undefined;
  return VIETQR_BANKS.find(
    (b) => b.code.toUpperCase() === normalized || b.bin === normalized
  );
}

/**
 * Generates an official Napas 247 VietQR image URL with pre-filled amount and transfer description.
 */
export function buildVietQrUrl(params: {
  bankBin: string;
  accountNumber: string;
  accountName?: string;
  amount?: number;
  addInfo?: string;
}): string | null {
  const bankId = params.bankBin.trim().replace(/[^a-zA-Z0-9]/g, "");
  const accountNo = params.accountNumber.trim().replace(/[^a-zA-Z0-9]/g, "");
  if (!bankId || !accountNo) return null;

  const search = new URLSearchParams();
  if (typeof params.amount === "number" && Number.isFinite(params.amount) && params.amount > 0) {
    search.set("amount", String(Math.round(params.amount)));
  }
  if (params.addInfo?.trim()) {
    search.set("addInfo", params.addInfo.trim().slice(0, 50));
  }
  if (params.accountName?.trim()) {
    search.set("accountName", params.accountName.trim().slice(0, 80));
  }
  const qs = search.toString();
  return `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(accountNo)}-compact2.png${qs ? `?${qs}` : ""}`;
}

