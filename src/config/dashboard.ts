import { Role } from "@/types/enums";

export const dashboardConfig: Partial<Record<Role, { widgets: string[] }>> = {
  MANAGEMENT: {
    widgets: ['stats', 'activity', 'financialSummary']
  },
  PRINCIPAL: {
    widgets: ['stats', 'activity', 'academicOverview']
  },
  TEACHER: {
    widgets: ['classes', 'schedule', 'attendance']
  },
  PARENT: {
    widgets: ['students', 'notices', 'fees']
  },
  ALUMNI: {
    widgets: ['news', 'donations']
  }
};
