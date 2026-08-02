const fs = require('fs');
let schema = fs.readFileSync('src/types/schema.ts', 'utf8');

schema = schema.replace(
  'export interface Alumni extends BaseEntity {\n  madrassaId: string;\n  studentId: string;\n  graduatedYearId: string;\n  userId?: string;\n}',
  'export interface Alumni extends BaseEntity {\n  madrassaId: string;\n  studentId: string;\n  graduatedYearId: string;\n  userId?: string;\n  alumniId?: string;\n  name?: string;\n  mobile?: string;\n  email?: string;\n  admissionNo?: string;\n  completionYear?: string;\n}'
);

schema = schema.replace(
  'export interface Promotion extends Omit<BaseEntity, \'status\'> {\n  madrassaId: string;\n  academicYearId: string;\n  fromClassId: string;\n  toClassId: string;\n  promotedCount: number;\n  alumniCount: number;\n  students: PromotionStudent[];\n  status: PromotionStatus;\n}',
  'export interface Promotion extends Omit<BaseEntity, \'status\'> {\n  madrassaId: string;\n  academicYearId: string;\n  fromClassId: string;\n  toClassId: string;\n  promotedCount: number;\n  alumniCount: number;\n  detainedCount?: number;\n  totalStudents?: number;\n  students: PromotionStudent[];\n  status: PromotionStatus;\n}'
);

schema = schema.replace(
  'export interface PromotionStudent extends BaseEntity {\n  studentId: string;\n  studentName: string;\n  resultStatus: string;\n  action: PromotionAction;\n}',
  'export interface PromotionStudent extends BaseEntity {\n  studentId: string;\n  studentName: string;\n  resultStatus: string;\n  action: PromotionAction;\n  previousClassId?: string;\n}'
);

fs.writeFileSync('src/types/schema.ts', schema);
console.log('Fixed schema');
