import { collection, query, where, QueryConstraint, getDocs, documentId, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { reportHelper } from "./reportHelper";
import { FeePayment, Student, Class, FeeCategory } from "@/types/schema";

export interface FeeReportFilters {
  academicYearId: string;
  startDate: string;
  endDate: string;
  classId?: string;
  paymentMethod?: string;
  status?: string;
  feeCategoryId?: string;
}

export interface EnrichedFeePayment extends FeePayment {
  studentName?: string;
  className?: string;
  categoryName?: string;
}

export const feeReportService = {
  async generateFeeCollectionReport(madrassaId: string, filters: FeeReportFilters): Promise<EnrichedFeePayment[]> {
    if (!filters.academicYearId || !filters.startDate || !filters.endDate) {
      throw new Error("Academic Year, Start Date, and End Date are mandatory for Fee Reports.");
    }

    const constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId),
      where("academicYearId", "==", filters.academicYearId),
    ];

    if (filters.status && filters.status !== "ALL") {
      constraints.push(where("status", "==", filters.status));
    }
    if (filters.paymentMethod && filters.paymentMethod !== "ALL") {
      constraints.push(where("paymentMethod", "==", filters.paymentMethod));
    }
    if (filters.feeCategoryId && filters.feeCategoryId !== "ALL") {
      constraints.push(where("feeCategoryId", "==", filters.feeCategoryId));
    }

    const q = query(collection(db, "feePayments"), ...constraints);
    const payments = await reportHelper.executeQueryWithLimit<FeePayment>(q, 2000);

    // Apply date range filter client-side as we are using paymentDate string formats YYYY-MM-DD
    let filteredPayments = payments.filter(p => {
      if (!p.paymentDate) return false;
      const dateIso = (p.paymentDate as any).toDate().toISOString();
      return dateIso.localeCompare(filters.startDate) >= 0 && dateIso.localeCompare(filters.endDate + "T23:59:59") <= 0;
    });

    if (filteredPayments.length === 0) return [];

    // Fetch related students
    const studentIds = Array.from(new Set(filteredPayments.map(p => p.studentId).filter(Boolean)));
    const studentsMap = new Map<string, Student>();
    
    // Use getDoc instead of `in` queries to completely avoid Firestore Security Rule issues with documentId() filtering
    if (studentIds.length > 0) {
      const studentPromises = studentIds.map(id => getDoc(doc(db, "students", id)));
      const studentSnaps = await Promise.all(studentPromises);
      studentSnaps.forEach(snap => {
        if (snap.exists()) {
          studentsMap.set(snap.id, { id: snap.id, ...snap.data() } as Student);
        }
      });
    }

    // Apply Class Filter if specified
    if (filters.classId && filters.classId !== "ALL") {
      filteredPayments = filteredPayments.filter(p => {
        const student = studentsMap.get(p.studentId);
        return student?.classId === filters.classId;
      });
    }

    if (filteredPayments.length === 0) return [];

    // Fetch Classes for names
    const classIds = Array.from(new Set(Array.from(studentsMap.values()).map(s => s.classId).filter(Boolean)));
    const classesMap = new Map<string, string>();
    if (classIds.length > 0) {
      const classPromises = classIds.map(id => getDoc(doc(db, "classes", id)));
      const classSnaps = await Promise.all(classPromises);
      classSnaps.forEach(snap => {
        if (snap.exists()) {
          classesMap.set(snap.id, (snap.data() as Class).name);
        }
      });
    }

    // Fetch Categories for names
    const categoryIds = Array.from(new Set(filteredPayments.map(p => p.feeCategoryId).filter(Boolean)));
    const categoriesMap = new Map<string, string>();
    if (categoryIds.length > 0) {
      const categoryPromises = categoryIds.map(id => getDoc(doc(db, "feeCategories", id)));
      const categorySnaps = await Promise.all(categoryPromises);
      categorySnaps.forEach(snap => {
        if (snap.exists()) {
          categoriesMap.set(snap.id, (snap.data() as FeeCategory).name);
        }
      });
    }

    // Enrich the payments
    return filteredPayments.map(p => {
      const student = studentsMap.get(p.studentId);
      
      let catName = categoriesMap.get(p.feeCategoryId);
      if (!catName && p.feeCategoryId === "ADMISSION_FEE_GEN") {
        catName = "Admission Fee";
      }

      return {
        ...p,
        studentName: student?.name || "Unknown",
        className: student?.classId ? classesMap.get(student.classId) || "Unknown" : "Unknown",
        categoryName: catName || "Unknown"
      };
    }).sort((a, b) => (b.paymentDate as any).toDate().getTime() - (a.paymentDate as any).toDate().getTime());
  }
};
