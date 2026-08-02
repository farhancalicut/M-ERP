import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Attendance, DailyAttendanceRecord } from "@/types/schema";
import { Role } from "@/types/enums";
import { Student } from "@/features/students/types";
import { differenceInDays, startOfDay, parseISO } from "date-fns";
import { AttendanceSettings } from "@/types/schema";

const COLLECTION = "attendance";
const STUDENTS_COLLECTION = "students";

export const attendanceService = {
  /**
   * Generates the deterministic document ID: {classId}_{date}
   */
  getDocId: (classId: string, date: string) => `${classId}_${date}`,

  /**
   * Validation rule: Teachers can only edit today and the past 3 days.
   * Principals and above can edit any date.
   */
  canEditAttendance: (dateString: string, role: Role, settings?: Pick<AttendanceSettings, 'allowPastEditDays' | 'allowFutureAttendance'>): boolean => {
    if (role === 'SUPER_ADMIN' || role === 'MANAGEMENT' || role === 'PRINCIPAL') {
      return true;
    }
    const targetDate = startOfDay(parseISO(dateString));
    const today = startOfDay(new Date());
    const diff = differenceInDays(today, targetDate);
    
    const pastDays = settings?.allowPastEditDays ?? 3;
    const allowFuture = settings?.allowFutureAttendance ?? false;
    
    if (diff < 0) { // Future date
      return allowFuture;
    }
    
    return diff >= 0 && diff <= pastDays;
  },

  /**
   * Fetches an attendance document.
   */
  getAttendance: async (madrassaId: string, classId: string, date: string): Promise<Attendance | null> => {
    const q = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", madrassaId),
      where("classId", "==", classId),
      where("date", "==", date),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty && snap.docs.length > 0) {
      return snap.docs[0]!.data() as Attendance;
    }
    return null;
  },

  /**
   * Initializes a draft attendance document for a class.
   * Uses runTransaction to prevent race conditions (duplicate creation).
   */
  initializeDraft: async (
    madrassaId: string,
    academicYearId: string,
    classId: string,
    date: string, // YYYY-MM-DD
    createdByUserId: string,
    createdByRole: Role,
    settings?: Pick<AttendanceSettings, 'defaultStatus'>
  ): Promise<Attendance> => {
    const docId = attendanceService.getDocId(classId, date);
    const docRef = doc(db, COLLECTION, docId);

    // 1. Fetch active students for this class first (outside transaction, since it's just a read)
    const studentsQuery = query(
      collection(db, STUDENTS_COLLECTION),
      where("madrassaId", "==", madrassaId),
      where("classId", "==", classId),
      where("status", "==", "ACTIVE")
    );
    const studentsSnap = await getDocs(studentsQuery);
    const students: Student[] = studentsSnap.docs.map(d => d.data() as Student);

    // 2. Prepare the map and IDs snapshot
    const studentIds: string[] = [];
    const attendanceMap: Record<string, DailyAttendanceRecord> = {};
    
    // Use defaultStatus from settings, fallback to PRESENT
    const defStatus = settings?.defaultStatus ?? "PRESENT";
    
    students.forEach((student) => {
      studentIds.push(student.studentId);
      attendanceMap[student.studentId] = {
        status: defStatus,
        remarks: "",
        markedBy: createdByUserId,
        updatedBy: createdByUserId,
        updatedAt: serverTimestamp() as unknown as Timestamp
      };
    });

    const totalStudents = students.length;
    const [yearStr, monthStr] = date.split('-');

    // 3. Run Transaction to create if not exists
    try {
      return await runTransaction(db, async (transaction) => {
        const existingDoc = await transaction.get(docRef);
        if (existingDoc.exists()) {
          // Someone else initialized it
          return existingDoc.data() as Attendance;
        }

        const newAttendance: Attendance = {
          id: docId,
          madrassaId,
          academicYearId,
          classId,
          date,
          month: parseInt(monthStr || '0', 10),
          year: parseInt(yearStr || '0', 10),
          studentIds,
          totalStudents,
          presentCount: totalStudents,
          absentCount: 0,
          leaveCount: 0,
          status: "DRAFT",
          locked: false,
          attendance: attendanceMap,
          lastUpdatedRole: createdByRole,
          createdAt: serverTimestamp() as unknown as Timestamp,
          createdBy: createdByUserId,
          updatedAt: serverTimestamp() as unknown as Timestamp,
          updatedBy: createdByUserId,
        };

        transaction.set(docRef, newAttendance);
        return newAttendance;
      });
    } catch (error: any) {
      if (error?.code === 'already-exists' || error?.message?.includes('already-exists')) {
        // Fallback: document was created by a racing request (like React strict mode)
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return snap.data() as Attendance;
        }
      }
      throw error;
    }
  },

  /**
   * Saves attendance as a draft (does not compute final stats or change status to SUBMITTED).
   */
  saveDraft: async (
    classId: string,
    date: string,
    attendanceMap: Record<string, DailyAttendanceRecord>,
    updatedBy: string,
    role: Role,
    settings?: Pick<AttendanceSettings, 'allowPastEditDays' | 'allowFutureAttendance'>
  ): Promise<void> => {
    if (!attendanceService.canEditAttendance(date, role, settings)) {
      throw new Error("You do not have permission to edit attendance for this date.");
    }
    
    const docId = attendanceService.getDocId(classId, date);
    const docRef = doc(db, COLLECTION, docId);
    
    // First verify it's not locked
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data().locked) {
      throw new Error("Attendance is locked and cannot be modified.");
    }

    await updateDoc(docRef, {
      attendance: attendanceMap,
      lastUpdatedRole: role,
      updatedBy,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Submits the attendance (calculates counts and changes status to SUBMITTED).
   */
  submitAttendance: async (
    classId: string,
    date: string,
    attendanceMap: Record<string, DailyAttendanceRecord>,
    updatedBy: string,
    role: Role,
    settings?: Pick<AttendanceSettings, 'allowPastEditDays' | 'allowFutureAttendance'>
  ): Promise<void> => {
    if (!attendanceService.canEditAttendance(date, role, settings)) {
      throw new Error("You do not have permission to edit attendance for this date.");
    }

    const docId = attendanceService.getDocId(classId, date);
    const docRef = doc(db, COLLECTION, docId);

    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data().locked) {
      throw new Error("Attendance is locked and cannot be modified.");
    }

    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;

    Object.values(attendanceMap).forEach((record) => {
      if (record.status === "PRESENT") presentCount++;
      else if (record.status === "ABSENT") absentCount++;
      else if (record.status === "LEAVE") leaveCount++;
    });

    await updateDoc(docRef, {
      attendance: attendanceMap,
      presentCount,
      absentCount,
      leaveCount,
      status: "SUBMITTED",
      lastUpdatedRole: role,
      updatedBy,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Principal only: Locks the attendance document to prevent further edits.
   */
  lockAttendance: async (classId: string, date: string, updatedBy: string, role: Role): Promise<void> => {
    if (role !== 'SUPER_ADMIN' && role !== 'MANAGEMENT' && role !== 'PRINCIPAL') {
      throw new Error("Only principals and administrators can lock attendance.");
    }

    const docId = attendanceService.getDocId(classId, date);
    const docRef = doc(db, COLLECTION, docId);
    await updateDoc(docRef, {
      locked: true,
      status: "LOCKED",
      lastUpdatedRole: role,
      updatedBy,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Principal only: Unlocks the attendance document.
   */
  unlockAttendance: async (classId: string, date: string, updatedBy: string, role: Role): Promise<void> => {
    if (role !== 'SUPER_ADMIN' && role !== 'MANAGEMENT' && role !== 'PRINCIPAL') {
      throw new Error("Only principals and administrators can unlock attendance.");
    }

    const docId = attendanceService.getDocId(classId, date);
    const docRef = doc(db, COLLECTION, docId);
    await updateDoc(docRef, {
      locked: false,
      status: "SUBMITTED",
      lastUpdatedRole: role,
      updatedBy,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Fetches attendance documents for a class. Optional pagination.
   */
  listAttendance: async (
    madrassaId: string,
    academicYearId: string,
    classId: string,
    month?: number,
    year?: number,
    pageSize: number = 20,
    lastDoc?: QueryDocumentSnapshot
  ): Promise<{ attendanceList: Attendance[], lastDoc: QueryDocumentSnapshot | null }> => {
    let q = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", madrassaId),
      where("academicYearId", "==", academicYearId),
      where("classId", "==", classId),
      orderBy("date", "desc")
    );

    if (month) {
      q = query(q, where("month", "==", month));
    }
    if (year) {
      q = query(q, where("year", "==", year));
    }

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    q = query(q, limit(pageSize));

    const snap = await getDocs(q);
    const attendanceList = snap.docs.map(d => d.data() as Attendance);
    const newLastDoc = snap.docs.length > 0 ? (snap.docs[snap.docs.length - 1] || null) : null;

    return { attendanceList, lastDoc: newLastDoc };
  },

  /**
   * Fetches attendance documents for a class within a custom date range.
   */
  listAttendanceByDateRange: async (
    madrassaId: string,
    academicYearId: string,
    classId: string,
    startDate: string,
    endDate: string
  ): Promise<{ attendanceList: Attendance[] }> => {
    const q = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", madrassaId),
      where("academicYearId", "==", academicYearId),
      where("classId", "==", classId),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "asc")
    );

    const snap = await getDocs(q);
    const attendanceList = snap.docs.map(d => d.data() as Attendance);

    return { attendanceList };
  }
};
