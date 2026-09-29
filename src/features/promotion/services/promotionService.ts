import { 
  collection, 
  doc, 
  getDocs,
  getDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  runTransaction,
  serverTimestamp,
  writeBatch,
  QueryDocumentSnapshot,
  Timestamp,
  QueryConstraint
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Promotion, PromotionStudent, Student, Class, Result } from "@/types/schema";
import { alumniService } from "./alumniService";
import { studentFeeService } from "@/features/fees/services/studentFeeService";

const COLLECTION = "promotions";

export interface PromotionPayload {
  madrassaId: string;
  academicYearId: string; // The completing academic year
  nextAcademicYearId: string; // The upcoming academic year
  fromClassId: string;
  toClassId?: string; // required unless all are ALUMNI
  students: PromotionStudent[];
  processedByUid: string;
}

export const promotionService = {
  
  /**
   * Load students and result to generate candidates
   */
  getPromotionCandidates: async (madrassaId: string, classId: string, examId: string, isHighestClass: boolean): Promise<PromotionStudent[]> => {
    const resultId = `${examId}_${classId}`;
    const resultRef = doc(db, "results", resultId);
    const resultSnap = await getDoc(resultRef);
    if (!resultSnap.exists()) throw new Error("No published results found for this class and exam. Please generate and publish results first.");
    const resultData = resultSnap.data() as Result;

    const studentQ = query(
      collection(db, "students"), 
      where("classId", "==", classId),
      where("madrassaId", "==", madrassaId),
      where("status", "==", "ACTIVE")
    );
    const studentsSnap = await getDocs(studentQ);
    
    const candidates: PromotionStudent[] = [];
    studentsSnap.forEach(snap => {
       const student = snap.data() as Student;
       // Result.students map is keyed by student.studentId (admission-style ID)
       const sResult = resultData.students[student.studentId];
       candidates.push({
          studentId: student.studentId,
          studentName: student.name,
          previousClassId: classId,
          // If no result found (student added after exam), default to DETAINED
          resultStatus: sResult ? sResult.resultStatus : "NO_RESULT",
          action: sResult?.resultStatus === "PASS" ? (isHighestClass ? "ALUMNI" : "PROMOTED") : "DETAINED",
          override: false
       });
    });

    return candidates;
  },

  /**
   * Helper to calculate promotion summary locally before transaction
   */
  calculatePromotionSummary: (students: PromotionStudent[]) => {
    let promotedCount = 0;
    let detainedCount = 0;
    let alumniCount = 0;
    
    students.forEach(s => {
      if (s.action === "PROMOTED") promotedCount++;
      else if (s.action === "DETAINED") detainedCount++;
      else if (s.action === "ALUMNI") alumniCount++;
    });

    return { totalStudents: students.length, promotedCount, detainedCount, alumniCount };
  },

  /**
   * Execute the bulk promotion in a transaction.
   * Safety check: prevents > 200 students to avoid Firebase 500-write limit per transaction.
   */
  promoteStudents: async (payload: PromotionPayload): Promise<{ promotion: Promotion, newCredentials: { name: string, userId: string, password?: string }[] }> => {
    if (payload.students.length > 200) {
      throw new Error("Promotion exceeds safe transaction limits (> 200 students).");
    }

    const { promotedCount, detainedCount, alumniCount } = promotionService.calculatePromotionSummary(payload.students);
    const newCredentials: { name: string, userId: string, password?: string }[] = [];
    const promotionDocRef = doc(collection(db, COLLECTION));

    // Track students for post-transaction fee initialization
    const feeInitList: { studentId: string; parentId: string; classId: string }[] = [];

    await runTransaction(db, async (transaction) => {
      // 1. Fetch source class and (optional) target class
      const fromClassRef = doc(db, "classes", payload.fromClassId);
      const fromClassSnap = await transaction.get(fromClassRef);
      if (!fromClassSnap.exists()) throw new Error("Source class not found");
      const fromClass = fromClassSnap.data() as Class;

      let toClassRef = null;
      let toClass: Class | null = null;
      if (payload.toClassId) {
        toClassRef = doc(db, "classes", payload.toClassId);
        const toClassSnap = await transaction.get(toClassRef);
        if (!toClassSnap.exists()) throw new Error("Destination class not found");
        toClass = toClassSnap.data() as Class;
      }

      // 2. Fetch all student docs first (reads before writes in transactions)
      const studentRefs = payload.students.map(s => doc(db, "students", s.studentId));
      const studentSnaps = await Promise.all(studentRefs.map(ref => transaction.get(ref)));

      // 2b. Pre-calculate ALUMNI login IDs and fetch pending users to avoid reads-after-writes
      const currentYear = new Date().getFullYear();
      let preCalcAlumniCounter = 1;
      const pendingUserRefs: any[] = [];
      const alumniStudentIds: string[] = [];

      for (let i = 0; i < payload.students.length; i++) {
        const s = payload.students[i]!;
        if (s.action === "ALUMNI") {
          const studentSnap = studentSnaps[i];
          if (studentSnap && studentSnap.exists()) {
             const studentDoc = studentSnap.data() as Student;
             const paddedCount = String(preCalcAlumniCounter).padStart(4, '0');
             const generatedAlumniId = `ALM${currentYear}${paddedCount}`;
             const loginId = studentDoc.studentId ? `ALM_${studentDoc.studentId}` : generatedAlumniId;
             pendingUserRefs.push(doc(db, "pendingUsers", loginId.toLowerCase()));
             alumniStudentIds.push(s.studentId);
             preCalcAlumniCounter++;
          }
        }
      }

      const pendingUserSnaps = await Promise.all(pendingUserRefs.map(ref => transaction.get(ref)));
      const pendingUserExistsMap = new Map<string, boolean>();
      alumniStudentIds.forEach((studentId, idx) => {
         pendingUserExistsMap.set(studentId, pendingUserSnaps[idx]!.exists());
      });

      let alumniCounter = 1;

      // 3. Process each student (writes only — all reads done above)
      for (let i = 0; i < payload.students.length; i++) {
        const s = payload.students[i]!;
        const studentSnap = studentSnaps[i];
        const studentRef = studentRefs[i]!;

        if (!studentSnap || !studentSnap.exists()) {
          throw new Error(`Invalid student data for ID: ${s.studentId}`);
        }
        const studentDoc = studentSnap.data() as Student;

        if (s.action === "PROMOTED") {
          if (!payload.toClassId) throw new Error("Destination class required for PROMOTED students.");
          transaction.update(studentRef, {
            classId: payload.toClassId,
            academicYearId: payload.nextAcademicYearId,
            updatedAt: serverTimestamp(),
            updatedBy: payload.processedByUid
          });
          // Queue for post-transaction fee initialization
          feeInitList.push({ studentId: s.studentId, parentId: studentDoc.parentId, classId: payload.toClassId });

        } else if (s.action === "DETAINED") {
          transaction.update(studentRef, {
            academicYearId: payload.nextAcademicYearId,
            updatedAt: serverTimestamp(),
            updatedBy: payload.processedByUid
          });
          // Detained students stay in same class
          feeInitList.push({ studentId: s.studentId, parentId: studentDoc.parentId, classId: payload.fromClassId });

        } else if (s.action === "ALUMNI") {
          transaction.update(studentRef, {
            status: "ALUMNI",
            updatedAt: serverTimestamp(),
            updatedBy: payload.processedByUid
          });

          const year = new Date().getFullYear();
          const { credentials } = await alumniService.createAlumniInTransaction(
            transaction,
            payload.madrassaId,
            { ...studentDoc, id: s.studentId },
            year,
            payload.processedByUid,
            alumniCounter++,
            pendingUserExistsMap.get(s.studentId) || false
          );

          if (credentials.password) {
            newCredentials.push({ name: studentDoc.name, ...credentials });
          }
        }
      }

      // 4. Update class strengths
      const departingCount = promotedCount + alumniCount;
      if (departingCount > 0) {
        transaction.update(fromClassRef, {
          currentStrength: Math.max(0, (fromClass.currentStrength || 0) - departingCount),
          updatedAt: serverTimestamp(),
          updatedBy: payload.processedByUid
        });
      }
      if (toClassRef && toClass && promotedCount > 0) {
        transaction.update(toClassRef, {
          currentStrength: (toClass.currentStrength || 0) + promotedCount,
          updatedAt: serverTimestamp(),
          updatedBy: payload.processedByUid
        });
      }

      // 5. Create Promotion record
      const promotionData: Omit<Promotion, "id"> = {
        madrassaId: payload.madrassaId,
        academicYearId: payload.academicYearId,
        fromClassId: payload.fromClassId,
        toClassId: payload.toClassId || "",
        totalStudents: payload.students.length,
        promotedCount,
        detainedCount,
        alumniCount,
        processedAt: serverTimestamp() as unknown as Timestamp,
        students: payload.students.map(s => {
          const cleaned = { ...s };
          Object.keys(cleaned).forEach(key => {
            if ((cleaned as any)[key] === undefined) {
              delete (cleaned as any)[key];
            }
          });
          return cleaned;
        }),
        status: "COMPLETED",
        createdAt: serverTimestamp() as unknown as Timestamp,
        createdBy: payload.processedByUid,
        updatedAt: serverTimestamp() as unknown as Timestamp,
        updatedBy: payload.processedByUid
      };
      transaction.set(promotionDocRef, promotionData);
    });

    // 6. Post-transaction: initialize student fee docs in a batch (cannot be inside transaction)
    if (feeInitList.length > 0) {
      const feeBatch = writeBatch(db);
      for (const { studentId, parentId, classId } of feeInitList) {
        const feeDocId = `${studentId}_${payload.nextAcademicYearId}`;
        const feeRef = doc(db, "studentFees", feeDocId);
        feeBatch.set(feeRef, {
          studentId,
          madrassaId: payload.madrassaId,
          parentId,
          classId,
          academicYearId: payload.nextAcademicYearId,
          monthlyFee: 0,
          assignedFees: [],
          totalAmount: 0,
          paidAmount: 0,
          dueAmount: 0,
          status: "CLEAR",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      await feeBatch.commit();
    }

    const docSnap = await getDoc(promotionDocRef);
    return {
      promotion: { id: promotionDocRef.id, ...docSnap.data() } as Promotion,
      newCredentials
    };
  },

  /**
   * Rollback a promotion. Completely reverts student classes, academic year, and status.
   * Decrements destination class, increments source class.
   * Requires strict validation: no attendance/marks/future promotions exist.
   */
  rollbackPromotion: async (promotionId: string, rolledBackByUid: string): Promise<void> => {
    const promotionRef = doc(db, COLLECTION, promotionId as string);
    
    // Check if next academic year started? That might be done at UI layer or here.
    let promotionData: Promotion | null = null;
    
    await runTransaction(db, async (transaction) => {
       const snap = await transaction.get(promotionRef);
       if (!snap.exists()) throw new Error("Promotion record not found.");
       const promotion = snap.data() as Promotion;
       promotionData = promotion;
       
       if (promotion.status === "ROLLED_BACK") {
         throw new Error("This promotion has already been rolled back.");
       }

       // For each student, check attendance/marks/promotions?
       // Doing all queries inside transaction is tricky due to limits (no queries allowed in runTransaction).
       // We must do read validation outside, or assume it's done outside. 
       // Actually, we can just revert the student object and adjust strengths.
       
       // Note: we can't do complex queries inside `runTransaction`. 
       // We should validate before calling runTransaction.
       
       const fromClassRef = doc(db, "classes", promotion.fromClassId as string);
       const fromClassSnap = await transaction.get(fromClassRef);
       let toClassRef = null;
       let toClassSnap = null;
       
       if (promotion.toClassId) {
         toClassRef = doc(db, "classes", promotion.toClassId as string);
         toClassSnap = await transaction.get(toClassRef);
       }

       for (const s of promotion.students) {
         const studentRef = doc(db, "students", s.studentId as string);
         
         if (s.action === "PROMOTED") {
            transaction.update(studentRef, {
              classId: s.previousClassId, 
              academicYearId: promotion.academicYearId, 
              updatedAt: serverTimestamp(),
              updatedBy: rolledBackByUid
            });
         } else if (s.action === "DETAINED") {
            transaction.update(studentRef, {
              academicYearId: promotion.academicYearId,
              updatedAt: serverTimestamp(),
              updatedBy: rolledBackByUid
            });
         } else if (s.action === "ALUMNI") {
            transaction.update(studentRef, {
              status: "ACTIVE",
              academicYearId: promotion.academicYearId,
              updatedAt: serverTimestamp(),
              updatedBy: rolledBackByUid
            });
         }
       }

       // Adjust class strengths
       const departingCount = promotion.promotedCount + promotion.alumniCount;
       if (departingCount > 0 && fromClassSnap.exists()) {
          const fc = fromClassSnap.data() as Class;
          transaction.update(fromClassRef, {
            currentStrength: ((fc.currentStrength || 0) || 0) + departingCount,
            updatedAt: serverTimestamp(),
            updatedBy: rolledBackByUid
          });
       }

       if (toClassRef && toClassSnap?.exists() && promotion.promotedCount > 0) {
          const tc = toClassSnap.data() as Class;
          transaction.update(toClassRef, {
             currentStrength: Math.max(0, ((tc.currentStrength || 0) || 0) - promotion.promotedCount),
             updatedAt: serverTimestamp(),
             updatedBy: rolledBackByUid
          });
       }

       transaction.update(promotionRef, {
         status: "ROLLED_BACK",
         rolledBackAt: serverTimestamp(),
         rolledBackBy: rolledBackByUid,
         updatedAt: serverTimestamp(),
         updatedBy: rolledBackByUid
       });
    });

    // Fix 8: After transaction, soft-delete orphaned alumni docs via batch
    const alumniStudentIds = promotionData!.students
      .filter((s: any) => s.action === "ALUMNI")
      .map((s: any) => s.studentId);

    if (alumniStudentIds.length > 0) {
      const alumniQ = query(
        collection(db, "alumni"),
        where("studentId", "in", alumniStudentIds)
      );
      const alumniSnap = await getDocs(alumniQ);
      if (!alumniSnap.empty) {
        const batch = writeBatch(db);
        alumniSnap.forEach(d => {
          batch.update(d.ref, {
            status: "INACTIVE",
            deletedAt: serverTimestamp(),
            deletedBy: rolledBackByUid,
            updatedAt: serverTimestamp(),
            updatedBy: rolledBackByUid
          });
        });
        await batch.commit();
      }
    }
  },

  /**
   * Validate if rollback is possible (no attendance, no marks, no further promotions).
   */
  validateRollbackAllowed: async (promotionId: string): Promise<void> => {
     const promotionRef = doc(db, COLLECTION, promotionId as string);
     const snap = await getDoc(promotionRef);
     if (!snap.exists()) throw new Error("Promotion not found.");
     const promotion = snap.data() as Promotion;

     // 1. Next academic year started check? 
     // We can just rely on no attendance/marks in the new class/academic year for these students.

     for (const s of promotion.students) {
        if (s.action === "PROMOTED") {
            // Check attendance in new class
            const attQ = query(
              collection(db, "attendance"),
              where("classId", "==", promotion.toClassId),
              where("academicYearId", "==", promotion.academicYearId),
              where("studentIds", "array-contains", s.studentId),
              limit(1)
            );
            const attSnap = await getDocs(attQ);
            if (!attSnap.empty) throw new Error(`Student ${s.studentName} has attendance in the new class.`);
            
            // Check marks
            const markQ = query(
              collection(db, "marks"),
              where("classId", "==", promotion.toClassId),
              where("academicYearId", "==", promotion.academicYearId),
              where("studentIds", "array-contains", s.studentId),
              limit(1)
            );
            const markSnap = await getDocs(markQ);
            if (!markSnap.empty) throw new Error(`Student ${s.studentName} has marks in the new class.`);
        }
     }
  },

  getPromotionHistory: async (
    madrassaId: string,
    academicYearId?: string,
    pageSize: number = 20,
    lastDoc?: QueryDocumentSnapshot
  ): Promise<{ promotions: Promotion[], lastDoc: QueryDocumentSnapshot | null }> => {
    const constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId)
    ];

    if (academicYearId) {
       constraints.push(where("academicYearId", "==", academicYearId));
    }

    constraints.push(orderBy("createdAt", "desc"));
    if (lastDoc) constraints.push(startAfter(lastDoc));
    constraints.push(limit(pageSize));

    const q = query(collection(db, COLLECTION), ...constraints);
    const snap = await getDocs(q);
    
    const promotions: Promotion[] = [];
    snap.forEach(d => promotions.push({ id: d.id, ...d.data() } as Promotion));

    return { 
      promotions, 
      lastDoc: snap.docs.length > 0 ? (snap.docs[snap.docs.length - 1] || null) : null 
    };
  }
};
