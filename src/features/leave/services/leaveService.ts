import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  QueryDocumentSnapshot,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { LeaveRequest } from "@/types/schema";
import { LeaveStatus, LeaveType, LeaveRequestType } from "@/types/enums";
import { format, eachDayOfInterval } from "date-fns";
import { notificationService } from "@/features/notifications/services/notificationService";

const COLLECTION = "leaveRequests";

export interface CreateStudentLeaveData {
  madrassaId: string;
  studentId: string;
  studentName: string;
  classId: string;
  parentUserId: string;
  leaveType: LeaveType;
  fromDate: Date;
  toDate: Date;
  reason: string;
  createdBy: string;
}

export interface CreateStaffLeaveData {
  madrassaId: string;
  userId: string;
  staffName: string;
  role: string;
  leaveType: LeaveType;
  fromDate: Date;
  toDate: Date;
  reason: string;
  createdBy: string;
}

export const leaveService = {

  /**
   * Parent submits a leave request for their child.
   */
  createStudentLeave: async (data: CreateStudentLeaveData): Promise<string> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fromDay = new Date(data.fromDate);
    fromDay.setHours(0, 0, 0, 0);
    if (fromDay < today) {
      throw new Error("Cannot request leave for past dates. Please select today or a future date.");
    }
    if (data.toDate < data.fromDate) {
      throw new Error("End date cannot be before start date.");
    }

    const docRef = await addDoc(collection(db, COLLECTION), {
      madrassaId: data.madrassaId,
      type: "STUDENT" as LeaveRequestType,
      requesterId: data.studentId,
      requesterName: data.studentName,
      classId: data.classId,
      parentUserId: data.parentUserId,
      leaveType: data.leaveType,
      fromDate: Timestamp.fromDate(data.fromDate),
      toDate: Timestamp.fromDate(data.toDate),
      reason: data.reason,
      status: "PENDING" as LeaveStatus,
      createdAt: serverTimestamp(),
      createdBy: data.createdBy,
      updatedAt: serverTimestamp(),
      updatedBy: data.createdBy,
    });
    return docRef.id;
  },

  /**
   * Staff member (Teacher/Principal) submits their own leave request.
   */
  createStaffLeave: async (data: CreateStaffLeaveData): Promise<string> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fromDay = new Date(data.fromDate);
    fromDay.setHours(0, 0, 0, 0);
    if (fromDay < today) {
      throw new Error("Cannot request leave for past dates. Please select today or a future date.");
    }
    if (data.toDate < data.fromDate) {
      throw new Error("End date cannot be before start date.");
    }

    const docRef = await addDoc(collection(db, COLLECTION), {
      madrassaId: data.madrassaId,
      type: "STAFF" as LeaveRequestType,
      requesterId: data.userId,
      requesterName: data.staffName,
      leaveType: data.leaveType,
      fromDate: Timestamp.fromDate(data.fromDate),
      toDate: Timestamp.fromDate(data.toDate),
      reason: data.reason,
      status: "PENDING" as LeaveStatus,
      createdAt: serverTimestamp(),
      createdBy: data.createdBy,
      updatedAt: serverTimestamp(),
      updatedBy: data.createdBy,
    });
    return docRef.id;
  },

  /**
   * Get leave requests with flexible filtering.
   */
  getLeaveRequests: async (
    madrassaId: string,
    filters?: {
      type?: LeaveRequestType;
      status?: LeaveStatus;
      requesterId?: string;
      parentUserId?: string;
      classIds?: string[];
    },
    pageSize: number = 30,
    lastDoc?: QueryDocumentSnapshot
  ): Promise<{ requests: LeaveRequest[]; lastDoc: QueryDocumentSnapshot | null }> => {
    const constraints: QueryConstraint[] = [
      where("madrassaId", "==", madrassaId),
      orderBy("createdAt", "desc"),
    ];
    if (filters?.type) constraints.push(where("type", "==", filters.type));
    if (filters?.status) constraints.push(where("status", "==", filters.status));
    if (filters?.requesterId) constraints.push(where("requesterId", "==", filters.requesterId));
    if (filters?.parentUserId) constraints.push(where("parentUserId", "==", filters.parentUserId));

    constraints.push(limit(pageSize));
    if (lastDoc) constraints.push(startAfter(lastDoc));

    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    let requests: LeaveRequest[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest));

    // Client-side filter for teacher's assigned classes (Firestore can't do array-in-array)
    if (filters?.classIds && filters.classIds.length > 0) {
      requests = requests.filter(r => r.classId && filters.classIds!.includes(r.classId));
    }
    
    // Also if classIds is an empty array, it means no classes assigned, filter out everything
    if (filters?.classIds && filters.classIds.length === 0) {
      requests = [];
    }

    const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1]! : null;
    return { requests, lastDoc: newLastDoc };
  },

  /**
   * Approves or rejects a leave request.
   * On approval of a STUDENT leave, auto-updates attendance records for the date range.
   */
  reviewLeave: async (
    leaveId: string,
    status: "APPROVED" | "REJECTED",
    reviewerUserId: string,
    reviewerName: string,
    reviewerNote?: string
  ): Promise<void> => {
    const leaveRef = doc(db, COLLECTION, leaveId);
    const leaveSnap = await getDoc(leaveRef);
    if (!leaveSnap.exists()) throw new Error("Leave request not found.");
    const leave = { id: leaveSnap.id, ...leaveSnap.data() } as LeaveRequest;
    if (leave.status !== "PENDING") throw new Error("This request has already been reviewed.");

    // 1. Update the leave document
    const updateData: Record<string, unknown> = {
      status,
      reviewerUserId,
      reviewerName,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: reviewerUserId,
    };
    if (reviewerNote) updateData.reviewerNote = reviewerNote;
    await updateDoc(leaveRef, updateData);

    // 2. If STUDENT leave is APPROVED, auto-mark attendance as LEAVE for each day
    if (status === "APPROVED" && leave.type === "STUDENT" && leave.classId && leave.requesterId) {
      try {
        const fromDate = leave.fromDate.toDate();
        const toDate = leave.toDate.toDate();
        const allDays = eachDayOfInterval({ start: fromDate, end: toDate });

        for (const day of allDays) {
          const dateStr = format(day, "yyyy-MM-dd");
          const attendanceDocId = `${leave.classId}_${dateStr}`;
          const attendanceRef = doc(db, "attendance", attendanceDocId);
          const attendanceSnap = await getDoc(attendanceRef);

          if (attendanceSnap.exists()) {
            const attData = attendanceSnap.data();
            if (!attData.locked) {
              const currentMap = attData.attendance || {};
              const studentId = leave.requesterId;
              if (currentMap[studentId]) {
                currentMap[studentId] = {
                  ...currentMap[studentId],
                  status: "LEAVE",
                  remarks: `Leave approved: ${leave.reason}`,
                  updatedBy: reviewerUserId,
                  updatedAt: Timestamp.now(),
                };
                // Recalculate counts
                let presentCount = 0, absentCount = 0, leaveCount = 0;
                Object.values(currentMap).forEach((r: any) => {
                  if (r.status === "PRESENT") presentCount++;
                  else if (r.status === "ABSENT") absentCount++;
                  else if (r.status === "LEAVE") leaveCount++;
                });
                await updateDoc(attendanceRef, {
                  attendance: currentMap,
                  presentCount, absentCount, leaveCount,
                  updatedAt: serverTimestamp(),
                  updatedBy: reviewerUserId,
                });
              }
            }
          }
        }
      } catch (err) {
        // Non-critical — log but don't fail the approval
        console.warn("Failed to auto-update attendance for approved leave:", err);
      }
    }

    // 3. Send notification
    try {
      const isApproved = status === "APPROVED";
      const notifTitle = leave.type === "STUDENT"
        ? `Student Leave ${isApproved ? "Approved" : "Rejected"}`
        : `Your Leave Request ${isApproved ? "Approved" : "Rejected"}`;
      const notifBody = leave.type === "STUDENT"
        ? `Leave for ${leave.requesterName} has been ${status.toLowerCase()}${reviewerNote ? `. Note: ${reviewerNote}` : ""}.`
        : `Your leave request has been ${status.toLowerCase()}${reviewerNote ? `. Note: ${reviewerNote}` : ""}.`;

      // Notify the parent (for student leave) or the staff member (for their own leave)
      const receiverUid = leave.type === "STUDENT" ? leave.parentUserId : leave.requesterId;
      if (receiverUid) {
        await notificationService.createNotification({
          madrassaId: leave.madrassaId,
          title: notifTitle,
          message: notifBody,
          type: "GENERAL",
          receiverType: "USER",
          receiverIds: [receiverUid],
          priority: "MEDIUM",
          icon: isApproved ? "SUCCESS" : ("WARNING" as any),
          status: "ACTIVE",
          expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
          readBy: [] as string[],
          updatedAt: serverTimestamp(),
        } as any);
      }
    } catch (err) {
      console.warn("Failed to send leave notification:", err);
    }
  },
};
