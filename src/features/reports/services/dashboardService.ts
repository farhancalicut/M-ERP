import { doc, getDoc, setDoc, updateDoc, increment, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { collection, query, where, getCountFromServer } from "firebase/firestore";

export const dashboardService = {
  /**
   * Run the actual aggregation queries as a fallback if the counter document is missing.
   */
  async runAggregationFallback(madrassaId: string) {
    const getCollectionCount = async (collectionName: string, filters: { field: string, operator: any, value: any }[]) => {
      const colRef = collection(db, collectionName);
      const qConstraints = filters.map(f => where(f.field, f.operator, f.value));
      const q = query(colRef, ...qConstraints);
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    };

    const [totalStudents, totalParents, totalTeachers, totalAlumni, totalClasses, totalSubjects] = await Promise.all([
      getCollectionCount("students", [
        { field: "madrassaId", operator: "==", value: madrassaId },
        { field: "status", operator: "==", value: "ACTIVE" }
      ]),
      getCollectionCount("parents", [
        { field: "madrassaId", operator: "==", value: madrassaId },
        { field: "status", operator: "==", value: "ACTIVE" }
      ]),
      getCollectionCount("users", [
        { field: "madrassaId", operator: "==", value: madrassaId },
        { field: "role", operator: "==", value: "TEACHER" },
        { field: "status", operator: "==", value: "ACTIVE" }
      ]),
      getCollectionCount("users", [
        { field: "madrassaId", operator: "==", value: madrassaId },
        { field: "role", operator: "==", value: "ALUMNI" },
        { field: "status", operator: "==", value: "ACTIVE" }
      ]),
      getCollectionCount("classes", [
        { field: "madrassaId", operator: "==", value: madrassaId }
      ]),
      getCollectionCount("subjects", [
        { field: "madrassaId", operator: "==", value: madrassaId }
      ])
    ]);

    const stats = {
      totalStudents,
      totalParents,
      totalTeachers,
      totalAlumni,
      totalClasses,
      totalSubjects,
      updatedAt: new Date().toISOString()
    };
    
    // Save to counter doc
    const ref = doc(db, "counters", `${madrassaId}_dashboard_stats`);
    await setDoc(ref, stats, { merge: true });
    return stats;
  },

  /**
   * Helper to increment or decrement a specific stat counter.
   */
  async updateStatCounter(madrassaId: string, field: 'totalStudents' | 'totalParents' | 'totalTeachers' | 'totalAlumni' | 'totalClasses' | 'totalSubjects', change: number) {
    if (!madrassaId) return;
    const ref = doc(db, "counters", `${madrassaId}_dashboard_stats`);
    try {
      await updateDoc(ref, {
        [field]: increment(change),
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      if (err.code === 'not-found') {
        // If doc doesn't exist yet, run the fallback which will initialize everything properly
        await this.runAggregationFallback(madrassaId);
      }
    }
  },

  async getManagementDashboardStats(madrassaId: string, forceRefresh = false) {
    const ref = doc(db, "counters", `${madrassaId}_dashboard_stats`);
    if (forceRefresh) {
      return await this.runAggregationFallback(madrassaId);
    }
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data();
    }
    // Fallback if not initialized
    return await this.runAggregationFallback(madrassaId);
  },

  async getPrincipalDashboardStats(madrassaId: string, forceRefresh = false) {
    // Principal uses the same stats, just different fields are displayed
    return this.getManagementDashboardStats(madrassaId, forceRefresh);
  },

  async getTeacherDashboardStats(madrassaId: string, teacherId: string, forceRefresh = false) {
    // Teacher stats are lightweight, we can just return 0s for now or query them directly later
    return {
      myClassesCount: 0,
      studentCount: 0,
    };
  },
  
  async getParentDashboardStats(madrassaId: string, parentId: string, forceRefresh = false) {
    // Parent stats only require 1 quick query (children count), so we can just run it live
    const colRef = collection(db, "users");
    const q = query(colRef, 
      where("madrassaId", "==", madrassaId), 
      where("role", "==", "STUDENT"), 
      where("parentId", "==", parentId), 
      where("status", "==", "ACTIVE")
    );
    const snapshot = await getCountFromServer(q);
    return { childrenCount: snapshot.data().count };
  },

  async getAlumniDashboardStats(madrassaId: string, alumniId: string, forceRefresh = false) {
    return { donationSummary: 0 };
  }
};
