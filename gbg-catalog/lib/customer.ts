import { cookies } from 'next/headers';

export interface CustomerContext {
  username: string | null;
  customerId: string | null;
}

// Populated by middleware.ts from the ?username=&customerId= params TM1
// sends on the iframe's entry URL. Not used for auth/pricing yet — this is
// just the read side, ready for when that logic is built.
export async function getCustomerContext(): Promise<CustomerContext> {
  const store = await cookies();
  return {
    username: store.get('gbg_username')?.value ?? null,
    customerId: store.get('gbg_customer_id')?.value ?? null,
  };
}
