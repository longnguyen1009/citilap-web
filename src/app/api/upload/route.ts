import {withAdminContext} from '@/server/admin-request-context';
import {requireAdminMutation} from '@/lib/auth';

// Library uploads and Studio revisions own media persistence and audit.
const legacyUpload=withAdminContext(async(request:Request)=>{
  const denied=await requireAdminMutation(request);
  if(denied)return denied;
  return Response.json({success:false,code:'LEGACY_WRITER_DISABLED',error:'Use /api/admin/media for uploads and Product Studio for product images.'},{status:409});
});
export const POST=legacyUpload;
export const PATCH=legacyUpload;
export const DELETE=legacyUpload;
