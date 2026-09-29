import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, Timestamp, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { PlatformQuestionPaper } from "@/types/schema";

export const questionPaperService = {
  async getQuestionPapers(boardId?: string, globalClassId?: string) {
    try {
      const qpRef = collection(db, "questionPapers");
      
      let constraints: any[] = [];
      if (boardId) constraints.push(where("boardId", "==", boardId));
      if (globalClassId) constraints.push(where("globalClassId", "==", globalClassId));
      
      constraints.push(orderBy("createdAt", "desc"));
      
      const q = query(qpRef, ...constraints);
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlatformQuestionPaper));
    } catch (error) {
      console.error("Error fetching question papers:", error);
      throw error;
    }
  },

  async saveQuestionPaper(data: Partial<PlatformQuestionPaper>, id?: string) {
    try {
      if (id) {
        const docRef = doc(db, "questionPapers", id);
        await updateDoc(docRef, {
          ...data,
          updatedAt: Timestamp.now(),
        });
        return id;
      } else {
        const newDocRef = doc(collection(db, "questionPapers"));
        await setDoc(newDocRef, {
          ...data,
          createdAt: Timestamp.now(),
        });
        return newDocRef.id;
      }
    } catch (error) {
      console.error("Error saving question paper:", error);
      throw error;
    }
  },

  async deleteQuestionPaper(id: string) {
    try {
      const docRef = doc(db, "questionPapers", id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error("Error deleting question paper:", error);
      throw error;
    }
  }
};
