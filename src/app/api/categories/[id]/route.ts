import { withAdminContext } from '@/server/admin-request-context';
﻿import { legacyCategoryMutation } from '@/server/navigation-http';
async function PATCHHandler(request: Request) { return legacyCategoryMutation(request); }
async function DELETEHandler(request: Request) { return legacyCategoryMutation(request); }

export const PATCH = withAdminContext(PATCHHandler);
export const DELETE = withAdminContext(DELETEHandler);
