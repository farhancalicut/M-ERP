import { 
  collection, 
  doc, 
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
  QueryConstraint
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { TeacherAssignment, User } from "@/types/schema";
import { AssignmentStatus } from "@/types/enums";

const COLLECTION = "teacherAssignments";

export const teacherAssignmentService = {
  
  /**
   * Get paginated teacher assignments
   */
  getTeacherAssignments: async (
    madrassaId: string,
    academicYearId: string,
    teacherUid?: string,
    classId?: string,
    subjectId?: string,
    statusFilter?: AssignmentStatus | "ALL",
    pageSize: number = 20,
    lastDoc?: QueryDocumentSnapshot
  ): Promise<{ assignments: TeacherAssignment[], lastDoc: QueryDocumentSnapshot | null }> => {
    const constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId),
      where("academicYearId", "==", academicYearId)
    ];

    if (statusFilter && statusFilter !== "ALL") {
      constraints.push(where("status", "==", statusFilter));
    }

    if (teacherUid) {
      constraints.push(where("teacherUid", "==", teacherUid));
    }
    
    if (classId) {
      constraints.push(where("classIds", "array-contains", classId));
    }
    
    // Firestore only supports one array-contains per query.
    // If both classId and subjectId are provided, we should ideally handle it via composite keys or client side filter.
    // Assuming mostly one filter is used at a time for arrays.
    if (subjectId && !classId) {
      constraints.push(where("subjectIds", "array-contains", subjectId));
    }

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    constraints.push(limit(pageSize));

    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);
    
    const assignments: TeacherAssignment[] = [];
    snapshot.forEach(doc => {
      assignments.push({ id: doc.id, ...doc.data() } as TeacherAssignment);
    });
    
    // Sort in memory by createdAt descending
    assignments.sort((a, b) => {
      const timeA = (a.createdAt as any)?.toMillis?.() || 0;
      const timeB = (b.createdAt as any)?.toMillis?.() || 0;
      return timeB - timeA;
    });
    
    // Client side filter for subjectId if classId was already used as array-contains
    let finalAssignments = assignments;
    if (subjectId && classId) {
        finalAssignments = assignments.filter(a => a.subjectIds.includes(subjectId));
    }

    const newLastDoc = snapshot.docs.length > 0 ? (snapshot.docs[snapshot.docs.length - 1] || null) : null;
    return { assignments: finalAssignments, lastDoc: newLastDoc };
  },

  /**
   * Assign a teacher (Creates assignment and syncs User doc)
   */
  assignTeacher: async (data: Omit<TeacherAssignment, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">, createdBy: string): Promise<{ assignment: TeacherAssignment, user: User }> => {
    const docRef = doc(collection(db, COLLECTION));
    const newAssignment: TeacherAssignment = {
      ...data,
      id: docRef.id,
      createdAt: Timestamp.now(),
      createdBy,
      updatedAt: Timestamp.now(),
      updatedBy: createdBy
    };
    
    let updatedUser: User | null = null;

    await runTransaction(db, async (transaction) => {
      // 1. Get current User to sync arrays
      const userRef = doc(db, "users", data.teacherUid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error("Teacher user document not found.");
      }
      
      const userData = userDoc.data() as User;
      
      // Merge unique class and subject IDs
      const currentClasses = userData.assignedClassIds || [];
      const currentSubjects = userData.assignedSubjects || [];
      
      const newAssignedClasses = Array.from(new Set([...currentClasses, ...data.classIds]));
      const newAssignedSubjects = Array.from(new Set([...currentSubjects, ...data.subjectIds]));
      
      updatedUser = {
        ...userData,
        id: userDoc.id,
        assignedClassIds: newAssignedClasses,
        assignedSubjects: newAssignedSubjects
      };

      // 2. Set assignment
      transaction.set(docRef, newAssignment);
      
      // 3. Update user
      transaction.update(userRef, {
        assignedClassIds: newAssignedClasses,
        assignedSubjects: newAssignedSubjects,
        updatedAt: serverTimestamp(),
        updatedBy: createdBy
      });
    });
    
    return { assignment: newAssignment, user: updatedUser! };
  },

  /**
   * Update an existing assignment
   */
  updateAssignment: async (id: string, data: Partial<TeacherAssignment>, updatedBy: string): Promise<{ assignment: TeacherAssignment, user: User }> => {
    const docRef = doc(db, COLLECTION, id);
    let updatedAssignment: TeacherAssignment | null = null;
    let updatedUser: User | null = null;
    
    await runTransaction(db, async (transaction) => {
      const assignmentDoc = await transaction.get(docRef);
      if (!assignmentDoc.exists()) {
        throw new Error("Assignment not found.");
      }
      
      const oldAssignment = assignmentDoc.data() as TeacherAssignment;
      updatedAssignment = { ...oldAssignment, ...data } as TeacherAssignment;
      
      // Update assignment
      transaction.update(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy
      });

      // Sync User if classIds or subjectIds changed, OR if status changed to INACTIVE/ARCHIVED
      if (data.classIds || data.subjectIds || data.status) {
         // To properly sync, we'd need to re-evaluate ALL active assignments for this teacher
         // and reconstruct the assignedClassIds array.
         // This is a known Firebase denormalization challenge. 
         const userRef = doc(db, "users", oldAssignment.teacherUid);
         const userDoc = await transaction.get(userRef);
         if (!userDoc.exists()) throw new Error("Teacher user not found");
         
         const userData = userDoc.data() as User;
         
         // Fetch all active assignments for this teacher
         const allAssignmentsQuery = query(
            collection(db, COLLECTION),
            where("madrassaId", "==", oldAssignment.madrassaId),
            where("teacherUid", "==", oldAssignment.teacherUid),
            where("status", "==", "ACTIVE")
         );
         
         // Since it's in a transaction, we can't reliably query and get updated results if we just updated one.
         // Wait, we CAN query in a transaction before we write, but getting the result *excluding* or *including* 
         // our current in-flight changes requires manual merging.
         // This is a very common pattern: fetch all others, merge with our new one.
         const allAssignmentsSnap = await getDocs(allAssignmentsQuery); // Allowed outside/inside if before writes.
         
         const activeClassIds = new Set<string>();
         const activeSubjectIds = new Set<string>();
         
         allAssignmentsSnap.forEach(snap => {
            if (snap.id !== id) {
               const a = snap.data() as TeacherAssignment;
               a.classIds.forEach((c: any) => activeClassIds.add(c));
               a.subjectIds.forEach((s: any) => activeSubjectIds.add(s));
            }
         });
         
         // Add the newly updated ones if it's still ACTIVE
         const newStatus = data.status ?? oldAssignment.status;
         if (newStatus === "ACTIVE") {
             const finalClassIds = data.classIds || oldAssignment.classIds;
             const finalSubjectIds = data.subjectIds || oldAssignment.subjectIds;
             finalClassIds.forEach((c: any) => activeClassIds.add(c));
             finalSubjectIds.forEach((s: any) => activeSubjectIds.add(s));
         }
         
         updatedUser = {
           ...userData,
           id: userDoc.id,
           assignedClassIds: Array.from(activeClassIds),
           assignedSubjects: Array.from(activeSubjectIds)
         };
         
         transaction.update(userRef, {
            assignedClassIds: Array.from(activeClassIds),
            assignedSubjects: Array.from(activeSubjectIds),
            updatedAt: serverTimestamp(),
            updatedBy
         });
      }
    });

    return { assignment: updatedAssignment!, user: updatedUser! };
  },

  /**
   * Remove (archive) assignment
   */
  removeAssignment: async (id: string, updatedBy: string): Promise<{ assignment: TeacherAssignment, user: User }> => {
    return teacherAssignmentService.updateAssignment(id, { status: "ARCHIVED" }, updatedBy);
  }
};
