import type { UserRole } from '../types.js';

export const canAccessRole = (currentRole: UserRole, allowedRoles: UserRole[]) => {
  return allowedRoles.includes(currentRole);
};
