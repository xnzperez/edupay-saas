export interface Tenant {
  id: string;
  name: string;
  domain: string;
  default_interest_rate: number;
  created_at: string;
}

export interface CreateTenantRequest {
  name: string;
  domain: string;
  default_interest_rate: number;
}
