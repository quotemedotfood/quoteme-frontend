// DashboardDistributorsPage — /dashboard/distributors
// Wraps ChefDistributorsEmpty within the canonical V3 dashboard route namespace.

import { ChefDistributorsEmpty } from '../../components/chef/ChefDistributorsEmpty';

export function DashboardDistributorsPage() {
  return <ChefDistributorsEmpty />;
}
