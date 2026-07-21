import { cookies } from 'next/headers';

export interface CustomerContext {
  username: string | null;
}

// Populated by middleware.ts from the trusted x-auth-user header (gatekeeper,
// via Traefik authResponseHeaders), falling back to ?username= for local dev.
// Not used for auth/pricing yet — this is just the read side, ready for when
// that logic is built.
export async function getCustomerContext(): Promise<CustomerContext> {
  const store = await cookies();
  return {
    username: store.get('gbg_username')?.value ?? null,
  };
}
