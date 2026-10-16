export type AdminRole = 'OWNER' | 'EDITOR' | 'SALES';
export interface AdminPrincipal {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  piiExport: boolean;
  version: number;
}
export type AdminCapability = 'content' | 'commerce' | 'orders' | 'contacts' | 'customers' | 'export' | 'system';

export function canAdmin(principal: AdminPrincipal, capability: AdminCapability): boolean {
  if (principal.role === 'OWNER') return true;
  if (principal.role === 'EDITOR') return capability === 'content' || capability === 'commerce';
  return ['orders', 'contacts', 'customers'].includes(capability) || (capability === 'export' && principal.piiExport);
}

/** Unknown protected routes are Owner-only, never implicitly authorized. */
export function adminCapability(path: string): AdminCapability {
  if (/\/(orders|contacts|customers)\/export\/?$/.test(path)) return 'export';
  if (/^\/(api\/)?(admin\/)?(orders|notifications)(\/|$)/.test(path)) return 'orders';
  if (/^\/(api\/)?(admin\/)?contacts(\/|$)/.test(path)) return 'contacts';
  if (/^\/(api\/)?(admin\/)?customers(\/|$)/.test(path)) return 'customers';
  if (/^\/(api\/)?admin\/campaigns(\/|$)/.test(path)) return 'commerce';
  if (/^\/(api\/)?(admin\/)?(products|product-studio|categories|brands|media|library|upload|navigation|builder|pages|posts|post-categories)(\/|$)/.test(path)) return 'content';
  return 'system';
}
