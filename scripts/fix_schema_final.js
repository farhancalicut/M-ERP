const fs = require('fs');
let schema = fs.readFileSync('src/types/schema.ts', 'utf8');

schema = schema.replace(
  'export interface Attendance extends Omit<BaseEntity, \'status\'> {',
  'export interface Attendance extends Omit<BaseEntity, \'status\'> {\n  madrassaId: string;'
);

schema = schema.replace(
  'export interface FeeCategory extends Omit<BaseEntity, \'status\'> {',
  'export interface FeeCategory extends Omit<BaseEntity, \'status\'> {\n  madrassaId: string;'
);

schema = schema.replace(
  'export interface FeePayment extends Omit<BaseEntity, \'status\'> {',
  'export interface FeePayment extends Omit<BaseEntity, \'status\'> {\n  madrassaId: string;'
);

schema = schema.replace(
  'export interface Promotion extends Omit<BaseEntity, \'status\'> {\n  madrassaId: string;',
  'export interface Promotion extends Omit<BaseEntity, \'status\'> {\n  madrassaId: string;\n  processedAt?: Timestamp;'
);

schema = schema.replace(
  'export interface PendingUser extends BaseEntity {\n  email: string;\n  role: Role;\n  madrassaId: string;\n}',
  'export interface PendingUser extends BaseEntity {\n  email: string;\n  role: Role;\n  madrassaId: string;\n  passwordHash?: string;\n  salt?: string;\n  iterations?: number;\n  userId?: string;\n  generatedEmail?: string;\n}'
);

fs.writeFileSync('src/types/schema.ts', schema);
console.log('Fixed schema final');
