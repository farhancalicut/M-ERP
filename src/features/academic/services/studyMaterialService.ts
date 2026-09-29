import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, limit, startAfter, Timestamp, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { StudyMaterial } from "@/types/schema";
import { StudyMaterialFormValues } from "../schemas/academicSchemas";

const COLLECTION_NAME = "studyMaterials";

export const studyMaterialService = {
  createMaterial: async (madrassaId: string, academicYearId: string, data: StudyMaterialFormValues, userId: string): Promise<string> => {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const id = docRef.id;
    
    const material: StudyMaterial = {
      id,
      madrassaId,
      academicYearId,
      classId: data.classId,
      subjectId: data.subjectId,
      teacherId: userId,
      title: data.title,
      description: data.description,
      attachments: data.files ? data.files.map(f => ({ ...f, uploadedAt: Timestamp.now() })) : [],
      status: 'ACTIVE',
      createdAt: Timestamp.now(),
      createdBy: userId,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    };

    await setDoc(docRef, material);
    return id;
  },

  updateMaterial: async (id: string, data: StudyMaterialFormValues, userId: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      classId: data.classId,
      subjectId: data.subjectId,
      title: data.title,
      description: data.description,
      attachments: data.files ? data.files.map(f => ({ ...f, uploadedAt: Timestamp.now() })) : [],
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    });
  },

  updateStatus: async (id: string, status: StudyMaterial['status'], userId: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      status,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    });
  },

  getMaterial: async (id: string): Promise<StudyMaterial | null> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as StudyMaterial;
  },

  getMaterials: async (
    madrassaId: string, 
    academicYearId: string, 
    filters?: { classId?: string; subjectId?: string; status?: StudyMaterial['status'] },
    lastDoc?: QueryDocumentSnapshot<DocumentData>,
    pageSize = 20
  ) => {
    let q = query(
      collection(db, COLLECTION_NAME),
      where("madrassaId", "==", madrassaId),
      where("academicYearId", "==", academicYearId)
    );

    const querySnapshot = await getDocs(q);
    let materials = querySnapshot.docs.map(doc => doc.data() as StudyMaterial);

    if (filters?.classId) {
      materials = materials.filter(m => m.classId === filters.classId);
    }
    if (filters?.subjectId) {
      materials = materials.filter(m => m.subjectId === filters.subjectId);
    }
    if (filters?.status) {
      materials = materials.filter(m => m.status === filters.status);
    } else {
      materials = materials.filter(m => m.status !== "ARCHIVED");
    }

    materials.sort((a, b) => {
      if (a.status !== b.status) return a.status.localeCompare(b.status);
      return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
    });

    return { materials, lastDoc: null };
  }
};
