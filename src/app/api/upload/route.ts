import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ success: false, error: "Không có file" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ success: false, error: "File vượt quá 5MB" }, { status: 400 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ success: false, error: "Chỉ chấp nhận JPG, PNG, WebP, GIF" }, { status: 400 });

    await mkdir(UPLOAD_DIR, { recursive: true });
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);

    const url = `/uploads/products/${filename}`;
    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json({ success: false, error: "Upload thất bại" }, { status: 500 });
  }
}
