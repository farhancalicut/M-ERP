import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  runTransaction,
  serverTimestamp,
  QueryDocumentSnapshot,
  Timestamp,
  QueryConstraint,
  deleteDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { AcademicYear } from "@/types/schema";
import { AcademicYearStatus } from "@/types/enums";

const COLLECTION = "academicYears";

export const academicYearService = {
  
  /**
   * Get paginated academic years for a madrassa
   */
  getAcademicYears: async (
    madrassaId: string,
    statusFilter?: AcademicYearStatus | "ALL",
    searchTerm?: string,
    pageSize: number = 20,
    lastDoc?: QueryDocumentSnapshot
  ): Promise<{ years: AcademicYear[], lastDoc: QueryDocumentSnapshot | null }> => {
    const constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId)
    ];

    if (statusFilter && statusFilter !== "ALL") {
      constraints.push(where("status", "==", statusFilter));
    }
    
    if (searchTerm) {
      constraints.push(
        where("name", ">=", searchTerm),
        where("name", "<=", searchTerm + "\uf8ff")
      );
    }
    
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    constraints.push(limit(pageSize));

    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);
    
    const years: AcademicYear[] = [];
    snapshot.forEach(doc => {
      years.push({ id: doc.id, ...doc.data() } as AcademicYear);
    });

    if (!searchTerm) {
      years.sort((a, b) => b.startDate.toMillis() - a.startDate.toMillis());
    }

    const newLastDoc = snapshot.docs.length > 0 ? (snapshot.docs[snapshot.docs.length - 1] || null) : null;
    return { years, lastDoc: newLastDoc };
  },

  /**
   * Create a new Academic Year
   */
  createAcademicYear: async (data: Omit<AcademicYear, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">, createdBy: string): Promise<AcademicYear> => {
    const docRef = doc(collection(db, COLLECTION));
    const newYear: AcademicYear = {
      ...data,
      id: docRef.id,
      createdAt: Timestamp.now(),
      createdBy,
      updatedAt: Timestamp.now(),
      updatedBy: createdBy
    };
    
    await runTransaction(db, async (transaction) => {
      transaction.set(docRef, newYear);
    });
    
    return newYear;
  },

  /**
   * Update an existing Academic Year
   */
  updateAcademicYear: async (id: string, data: Partial<AcademicYear>, updatedBy: string): Promise<void> => {
    const docRef = doc(db, COLLECTION, id);
    await runTransaction(db, async (transaction) => {
      transaction.update(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy
      });
    });
  },

  /**
   * Activate an Academic Year.
   */
  activateAcademicYear: async (madrassaId: string, yearToActivate: AcademicYear, updatedBy: string): Promise<void> => {
    await runTransaction(db, async (transaction) => {
      const settingsRef = doc(db, `madrassas/${madrassaId}/settings`, "currentAcademicYear");
      const settingsDoc = await transaction.get(settingsRef);
      
      if (settingsDoc.exists()) {
        const currentYearId = settingsDoc.data().id;
        if (currentYearId === yearToActivate.id) {
          throw new Error("This academic year is already active.");
        }
        
        const currentYearRef = doc(db, COLLECTION, currentYearId);
        transaction.update(currentYearRef, {
          status: "COMPLETED" as AcademicYearStatus,
          updatedAt: serverTimestamp(),
          updatedBy
        });
      }
      
      const newYearRef = doc(db, COLLECTION, yearToActivate.id!);
      transaction.update(newYearRef, {
        status: "ACTIVE" as AcademicYearStatus,
        updatedAt: serverTimestamp(),
        updatedBy
      });

      transaction.set(settingsRef, {
        id: yearToActivate.id,
        name: yearToActivate.name,
        startDate: yearToActivate.startDate,
        endDate: yearToActivate.endDate
      });
    });
  },

  /**
   * Soft delete (archive)
   */
  archiveAcademicYear: async (id: string, updatedBy: string): Promise<void> => {
    const docRef = doc(db, COLLECTION, id);
    await runTransaction(db, async (transaction) => {
      const yearDoc = await transaction.get(docRef);
      if (yearDoc.data()?.status === "ACTIVE") {
        throw new Error("Cannot archive an ACTIVE academic year.");
      }
      
      transaction.update(docRef, {
        status: "ARCHIVED" as AcademicYearStatus,
        updatedAt: serverTimestamp(),
        updatedBy
      });
    });
  },

  /**
   * Get Current Academic Year configuration directly from settings
   */
  getCurrentAcademicYearSettings: async (madrassaId: string) => {
    const settingsRef = doc(db, `madrassas/${madrassaId}/settings`, "currentAcademicYear");
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
      return docSnap.data() as { id: string, name: string, startDate: Timestamp, endDate: Timestamp };
    }
    return null;
  },

  /**
   * Delete Academic Year
   */
  deleteAcademicYear: async (id: string): Promise<void> => {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().status === "ACTIVE") {
      throw new Error("Cannot delete an ACTIVE academic year.");
    }
    await deleteDoc(docRef);
  }
};
