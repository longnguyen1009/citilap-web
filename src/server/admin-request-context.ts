import { adminContext, adminRequestId } from './admin-context';
import { resolveAdmin } from './services/admin-identity.service';

/** HTTP boundary; canonical writers only import request-local actor/audit helpers. */
export function withAdminContext<R extends Request, Args extends unknown[], Result>(handler: (request: R, ...args: Args) => Promise<Result>) {
  return async (request: R, ...args: Args) => {
    let principal;
    try { principal = await resolveAdmin(request); }
    catch { return Response.json({success:false,error:'Authentication unavailable'}, {status:503}); }
    return adminRequestId.run(crypto.randomUUID(), () => adminContext.run(principal, () => handler(request, ...args)));
  };
}
