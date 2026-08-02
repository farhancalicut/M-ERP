const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, '..', 'src/features/reports/services');
const componentsDir = path.join(__dirname, '..', 'src/features/reports/components');

// 1. Fix firebase import in all services
const servicesFiles = fs.readdirSync(servicesDir).filter(f => f.endsWith('.ts'));
for (const file of servicesFiles) {
  const filePath = path.join(servicesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/@\/lib\/firebase\/config/g, '@/lib/firebase/firestore');
  
  // Also fix specific errors in services
  if (file === 'feeReportService.ts') {
    // Fix localeCompare on Timestamp
    content = content.replace(/p\.paymentDate\.localeCompare\(startDate\)/g, '(p.paymentDate as any).toDate().toISOString().localeCompare(startDate)');
    content = content.replace(/p\.paymentDate\.localeCompare\(endDate\)/g, '(p.paymentDate as any).toDate().toISOString().localeCompare(endDate)');
  }
  
  if (file === 'studentReportService.ts') {
    // Fix 'name' on User
    content = content.replace(/a\.name\.localeCompare\(b\.name\)/g, '(a as any).displayName.localeCompare((b as any).displayName)');
  }
  
  if (file === 'alumniReportService.ts') {
    // Fix 'alumniProfile' on User
    content = content.replace(/a\.alumniProfile\?\.graduationYear/g, '(a as any).alumniProfile?.graduationYear');
  }

  if (file === 'examReportService.ts') {
    // Fix missing ExamResult from schema
    content = content.replace(/import { ExamResult } from "@\/types\/schema";/, 'import { ExamResult } from "@/features/exams/services/resultService";');
    content = content.replace(/import { ExamResult } from "@\/types\/schema";/, ''); // if double
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

// 2. Fix Recharts typings in DashboardChartCard.tsx
const chartCardPath = path.join(componentsDir, 'DashboardChartCard.tsx');
let chartContent = fs.readFileSync(chartCardPath, 'utf8');
chartContent = chartContent.replace(/stroke={colors\[0\]}/g, 'stroke={colors[0] || "#000"}');
chartContent = chartContent.replace(/fill={colors\[0\]}/g, 'fill={colors[0] || "#000"}');
chartContent = chartContent.replace(/fill={colors\[index % colors\.length\]}/g, 'fill={colors[index % colors.length] || "#000"}');
fs.writeFileSync(chartCardPath, chartContent, 'utf8');

console.log("Fixed report TS errors");
