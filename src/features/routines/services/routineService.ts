import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  QueryConstraint
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { RoutineTemplate, DailyRoutineLog, RoutineTaskLog } from "@/types/schema";

const TEMPLATES_COLLECTION = "routineTemplates";
const LOGS_COLLECTION = "dailyRoutineLogs";

export const routineService = {
  
  // ==========================================
  // TEMPLATES
  // ==========================================

  getTemplates: async (madrassaId: string): Promise<RoutineTemplate[]> => {
    const q = query(
      collection(db, TEMPLATES_COLLECTION),
      where("madrassaId", "==", madrassaId)
    );
    const snap = await getDocs(q);
    const templates = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoutineTemplate));
    return templates.sort((a, b) => {
      const timeA = a.createdAt ? (a.createdAt as Timestamp).toMillis() : 0;
      const timeB = b.createdAt ? (b.createdAt as Timestamp).toMillis() : 0;
      return timeB - timeA;
    });
  },

  getTemplateById: async (id: string): Promise<RoutineTemplate | null> => {
    const snap = await getDoc(doc(db, TEMPLATES_COLLECTION, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as RoutineTemplate;
  },

  /**
   * Get all active templates for a specific class
   */
  getActiveTemplatesForClass: async (madrassaId: string, classId: string): Promise<RoutineTemplate[]> => {
    const q = query(
      collection(db, TEMPLATES_COLLECTION),
      where("madrassaId", "==", madrassaId)
    );
    const snap = await getDocs(q);
    const templates = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoutineTemplate));
    
    // Return all active templates that include the classId
    return templates.filter(t => t.isActive && t.classIds.includes(classId));
  },

  createTemplate: async (data: Omit<RoutineTemplate, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">, uid: string): Promise<RoutineTemplate> => {
    const docRef = doc(collection(db, TEMPLATES_COLLECTION));
    const newDoc: RoutineTemplate = {
      ...data,
      id: docRef.id,
      createdAt: serverTimestamp() as unknown as Timestamp,
      updatedAt: serverTimestamp() as unknown as Timestamp,
      createdBy: uid,
      updatedBy: uid
    };
    await setDoc(docRef, newDoc);
    return newDoc;
  },

  updateTemplate: async (id: string, data: Partial<RoutineTemplate>, uid: string): Promise<void> => {
    const docRef = doc(db, TEMPLATES_COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
      updatedBy: uid
    });
  },

  deleteTemplate: async (id: string): Promise<void> => {
    // Soft delete or hard delete depending on requirement. Hard delete for templates is usually fine if no logs depend on strict relational consistency, but they do. 
    // We'll just toggle active instead, or allow hard delete if needed. Here we'll just delete.
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, TEMPLATES_COLLECTION, id));
  },

  // ==========================================
  // DAILY LOGS
  // ==========================================

  getLogId: (studentId: string, templateId: string, date: string) => `${studentId}_${templateId}_${date}`,

  getDailyLogForStudent: async (studentId: string, templateId: string, date: string): Promise<DailyRoutineLog | null> => {
    // Check new ID format first
    const docId = routineService.getLogId(studentId, templateId, date);
    let snap = await getDoc(doc(db, LOGS_COLLECTION, docId));
    
    // Fallback for legacy logs created before multi-template support
    if (!snap.exists()) {
      const legacyId = `${studentId}_${date}`;
      snap = await getDoc(doc(db, LOGS_COLLECTION, legacyId));
      // Only return legacy log if it actually matches this template
      if (snap.exists() && snap.data().templateId !== templateId) {
        return null;
      }
    }
    
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as DailyRoutineLog;
  },

  submitDailyLog: async (
    madrassaId: string,
    academicYearId: string,
    studentId: string,
    classId: string,
    templateId: string,
    date: string,
    tasks: Record<string, RoutineTaskLog>,
    uid: string
  ): Promise<void> => {
    const docId = routineService.getLogId(studentId, templateId, date);
    const docRef = doc(db, LOGS_COLLECTION, docId);
    
    const logData: Omit<DailyRoutineLog, "id"> = {
      madrassaId,
      academicYearId,
      studentId,
      classId,
      templateId,
      date,
      tasks,
      submitted: true,
      submittedAt: serverTimestamp() as unknown as Timestamp,
      createdAt: serverTimestamp() as unknown as Timestamp,
      updatedAt: serverTimestamp() as unknown as Timestamp,
      createdBy: uid,
      updatedBy: uid
    };

    // Use setDoc with merge to overwrite or create
    await setDoc(docRef, logData, { merge: true });
  },

  getClassRoutineLogs: async (madrassaId: string, classId: string, date: string): Promise<DailyRoutineLog[]> => {
    const q = query(
      collection(db, LOGS_COLLECTION),
      where("madrassaId", "==", madrassaId)
    );
    const snap = await getDocs(q);
    const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyRoutineLog));
    return logs.filter(l => l.classId === classId && l.date === date);
  },

  getWeeklyCompliance: async (madrassaId: string, classId: string, startDate: string, endDate: string): Promise<DailyRoutineLog[]> => {
    const q = query(
      collection(db, LOGS_COLLECTION),
      where("madrassaId", "==", madrassaId)
    );
    const snap = await getDocs(q);
    const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyRoutineLog));
    
    return logs.filter(l => 
      l.classId === classId && 
      l.date >= startDate && 
      l.date <= endDate
    );
  }
};
