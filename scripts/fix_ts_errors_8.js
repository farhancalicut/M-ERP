const fs = require('fs');

// 1. Fix schema again
let schema = fs.readFileSync('src/types/schema.ts', 'utf8');

if (!schema.includes('madrassaId: string;\n  academicYearId: string;\n  classId: string;\n  date: string; // Format: YYYY-MM-DD')) {
  schema = schema.replace(
    '  academicYearId: string;\n  classId: string;\n  date: string; // Format: YYYY-MM-DD',
    '  madrassaId: string;\n  academicYearId: string;\n  classId: string;\n  date: string; // Format: YYYY-MM-DD'
  );
}

if (!schema.includes('name?: string;\n}')) {
  schema = schema.replace(
    '  generatedEmail?: string;\n}',
    '  generatedEmail?: string;\n  name?: string;\n}'
  );
}

if (!schema.includes('processedBy?: string;')) {
  schema = schema.replace(
    '  processedAt?: Timestamp;\n}',
    '  processedAt?: Timestamp;\n  processedBy?: string;\n}'
  );
}

if (!schema.includes('override?: boolean;')) {
  schema = schema.replace(
    '  previousClassId?: string;\n}',
    '  previousClassId?: string;\n  override?: boolean;\n}'
  );
}

fs.writeFileSync('src/types/schema.ts', schema);


// 2. Fix firebaseUid
const filesWithFirebaseUid = [
  'src/features/auth/services/authService.ts',
  'src/features/promotion/components/AlumniTable.tsx',
  'src/features/promotion/components/PromotionHistoryTable.tsx',
  'src/providers/auth-provider.tsx'
];
filesWithFirebaseUid.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/firebaseUid/g, 'uid');
    fs.writeFileSync(file, content);
  }
});

// 3. Fix MarksEntryForm.tsx and ExamForm.tsx and NoticeForm.tsx
const marksFile = 'src/features/exams/components/MarksEntryForm.tsx';
if (fs.existsSync(marksFile)) {
  let content = fs.readFileSync(marksFile, 'utf8');
  content = content.replace(/studentId: s\.id(?! as string)/g, 'studentId: s.id as string');
  content = content.replace(/subjectId: subject\.id(?! as string)/g, 'subjectId: subject.id as string');
  content = content.replace(/\[student\.id\]/g, '[student.id as string]');
  content = content.replace(/\[subject\.id\]/g, '[subject.id as string]');
  content = content.replace(/marks\[student\.id as string\]/g, 'marks[student.id as string]'); // already ok?
  content = content.replace(/marks\[student\.id\]/g, 'marks[student.id as string]');
  content = content.replace(/\(student\.id\)/g, '(student.id as string)');
  content = content.replace(/\(subject\.id\)/g, '(subject.id as string)');
  content = content.replace(/s\.id \? /g, 's.id as string ? ');
  content = content.replace(/s\.id \|\| /g, 's.id as string || ');
  content = content.replace(/e\.id /g, 'e.id as string ');
  content = content.replace(/\[s\.id\]/g, '[s.id as string]');
  fs.writeFileSync(marksFile, content);
}

const examFile = 'src/features/exams/components/ExamForm.tsx';
if (fs.existsSync(examFile)) {
  let content = fs.readFileSync(examFile, 'utf8');
  content = content.replace(/subjectId: subject\.id(?! as string)/g, 'subjectId: subject.id as string');
  content = content.replace(/subject\.id !==/g, 'subject.id as string !==');
  content = content.replace(/\(subject\.id\)/g, '(subject.id as string)');
  fs.writeFileSync(examFile, content);
}

const noticeForm = 'src/features/notifications/components/NoticeForm.tsx';
if (fs.existsSync(noticeForm)) {
  let content = fs.readFileSync(noticeForm, 'utf8');
  content = content.replace(/c\.id\)/g, 'c.id as string)');
  fs.writeFileSync(noticeForm, content);
}

// 4. Fix usePermission.ts
const permFile = 'src/features/auth/hooks/usePermission.ts';
if (fs.existsSync(permFile)) {
  let content = fs.readFileSync(permFile, 'utf8');
  content = content.replace(/user\.permissions/g, 'user.role');
  fs.writeFileSync(permFile, content);
}

// 5. Fix remaining service files (id assignment)
const servicesToFix = [
  'src/features/auth/services/authService.ts',
  'src/features/exams/services/examService.ts',
  'src/features/exams/services/resultService.ts',
  'src/features/fees/services/studentFeeService.ts',
  'src/features/promotion/services/promotionService.ts',
  'src/features/promotion/services/alumniService.ts'
];
servicesToFix.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/studentId: student\.id(?! as string)/g, 'studentId: student.id as string');
    content = content.replace(/examId: exam\.id(?! as string)/g, 'examId: exam.id as string');
    content = content.replace(/classId: c\.id(?! as string)/g, 'classId: c.id as string');
    
    // alumniService.ts number to string
    if (file.includes('alumniService.ts')) {
      content = content.replace(/Number\(currentYear\.name\.split\('-\'\)\[1\]\)/g, "String(Number(currentYear.name.split('-')[1]))");
    }

    // studentFeeService.ts category.id
    if (file.includes('studentFeeService.ts')) {
      content = content.replace(/category\.id \|\|/g, 'category.id as string ||');
      content = content.replace(/feeCategoryId: category\.id(?! as string)/g, 'feeCategoryId: category.id as string');
      content = content.replace(/id: student\.id(?! as string)/g, 'id: student.id as string');
    }
    
    // authService.ts pendingUser id issue
    if (file.includes('authService.ts')) {
      content = content.replace(/passwordHash: pendingUser\.passwordHash/g, 'passwordHash: pendingUser.passwordHash as string');
    }

    fs.writeFileSync(file, content);
  }
});

console.log('Fixed TypeScript errors step 8');
