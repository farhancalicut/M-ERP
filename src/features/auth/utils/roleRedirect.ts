import { Role } from "@/types/enums";

export function getRoleRedirect(role: Role): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super-admin';
    case 'MANAGEMENT':
      return '/management';
    case 'PRINCIPAL':
      return '/principal';
    case 'TEACHER':
      return '/teacher';
    case 'PARENT':
      return '/parent';
    case 'ALUMNI':
      return '/alumni';
    default:
      return '/login';
  }
}
