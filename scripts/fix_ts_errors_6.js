const fs = require('fs');
const glob = require('glob'); // Assume we have it or we can just list files
const path = require('path');

const filesToUpdate = [
  'src/features/exams/components/MarksEntryForm.tsx',
  'src/features/exams/services/examService.ts',
  'src/features/exams/services/marksService.ts',
  'src/features/exams/services/resultService.ts',
  'src/features/fees/components/FeeCategoryTable.tsx',
  'src/features/fees/components/StudentFeeSearchClient.tsx',
  'src/features/fees/services/feeCategoryService.ts',
  'src/features/fees/services/paymentService.ts',
  'src/features/fees/services/studentFeeService.ts',
  'src/features/notifications/components/NoticeForm.tsx',
  'src/features/promotion/components/AlumniTable.tsx',
  'src/features/promotion/components/PromotionHistoryTable.tsx',
  'src/features/promotion/services/promotionService.ts',
  'src/providers/auth-provider.tsx'
];

filesToUpdate.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Fix auth-provider
  if (file.includes('auth-provider')) {
    content = content.replace('userDoc.firebaseUid', 'userDoc.uid');
  }

  // Fix MarksEntryForm
  if (file.includes('MarksEntryForm.tsx')) {
    content = content.replace(/subject\.id/g, 'subject.id as string');
    content = content.replace(/student\.id/g, 'student.id as string');
    content = content.replace(/m\.enteredBy/g, 'm.enteredBy as string');
  }

  // Fix examService
  if (file.includes('examService.ts')) {
    content = content.replace(/exam\.id/g, 'exam.id as string');
  }

  // Fix marksService
  if (file.includes('marksService.ts')) {
    content = content.replace(/exam\.id/g, 'exam.id as string');
    content = content.replace(/subject\.id/g, 'subject.id as string');
    content = content.replace(/studentId: string \| undefined/g, 'studentId: string');
  }

  // Fix resultService
  if (file.includes('resultService.ts')) {
    content = content.replace(/exam\.id/g, 'exam.id as string');
    content = content.replace(/student\.id/g, 'student.id as string');
  }

  // Fix fee components
  if (file.includes('FeeCategoryTable.tsx')) {
    content = content.replace(/category\.id/g, 'category.id as string');
  }
  if (file.includes('StudentFeeSearchClient.tsx')) {
    content = content.replace(/student\.id/g, 'student.id as string');
  }
  if (file.includes('NoticeForm.tsx')) {
    content = content.replace(/_\s*,\s*i\)/g, '_: any, i: number)');
    content = content.replace(/item\.id/g, 'item.id as string');
  }
  if (file.includes('AlumniTable.tsx')) {
    content = content.replace(/alumni\.id/g, 'alumni.id as string');
    content = content.replace(/alumni\.firebaseUid/g, 'alumni.userId');
  }
  if (file.includes('PromotionHistoryTable.tsx')) {
    content = content.replace(/user\.firebaseUid/g, 'user.uid');
    content = content.replace(/record\.id/g, 'record.id as string');
  }

  // Service files where 'id' is passed to doc() or updateDoc()
  if (file.includes('Service.ts')) {
    // For services, we often do `doc(db, ..., id)`
    content = content.replace(/doc\(\s*db\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/g, (match, collection, idArg) => {
       if (idArg.includes('undefined') || idArg.includes('?')) return match;
       if (!idArg.includes('as string') && !idArg.includes('\"') && !idArg.includes('\'') && !idArg.includes('\`')) {
          return `doc(db, ${collection}, ${idArg} as string)`;
       }
       return match;
    });
  }

  fs.writeFileSync(file, content);
});

console.log('Fixed TypeScript errors step 6');
