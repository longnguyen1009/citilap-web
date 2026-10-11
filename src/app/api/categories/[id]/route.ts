import { legacyCategoryMutation } from '@/server/navigation-http';
export async function PATCH(request: Request) { return legacyCategoryMutation(request); }
export async function DELETE(request: Request) { return legacyCategoryMutation(request); }
