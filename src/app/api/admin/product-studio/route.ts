import { mediaAdmin } from '@/server/media-http';
import { studioList, writeStudio } from '@/server/services/product-studio.service';
export async function GET(request: Request) { return mediaAdmin(request, false, env => studioList(env.DB, new URL(request.url).searchParams.get('q') || '')); }
export async function POST(request: Request) { return mediaAdmin(request, true, async env => writeStudio(env, null, await request.json())); }
