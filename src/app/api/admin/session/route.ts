import { resolveAdmin } from '@/server/services/admin-identity.service';
export async function GET(request: Request) {
  try {
    const principal = await resolveAdmin(request);
    return Response.json(principal ? {success:true,data:principal} : {success:false,error:'Unauthorized'},
      {status:principal ? 200 : 401,headers:{'Cache-Control':'private, no-store'}});
  } catch { return Response.json({success:false,error:'Authentication unavailable'}, {status:503}); }
}
