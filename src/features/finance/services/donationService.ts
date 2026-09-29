import { db } from "@/lib/firebase/firestore";
import { collection, doc, getDocs, deleteDoc, query, where, serverTimestamp, Timestamp, writeBatch } from "firebase/firestore";
import { Donation } from "@/types/schema";

const COLLECTION = "donations";

export const donationService = {
  createDonation: async (
    madrassaId: string,
    donorName: string,
    amount: number,
    paymentMethod: "CASH" | "BANK" | "UPI" | "OTHER",
    recordedByUid: string,
    donorContact?: string,
    purpose?: string,
    donationDate?: Date
  ): Promise<Donation> => {
    const batch = writeBatch(db);

    const donationRef = doc(collection(db, COLLECTION));
    const dDate = donationDate ? Timestamp.fromDate(donationDate) : Timestamp.now();

    const donation: Donation = {
      id: donationRef.id,
      madrassaId,
      donorName,
      donorContact: donorContact || "",
      purpose: purpose || "",
      amount,
      paymentMethod,
      recordedBy: recordedByUid,
      date: dDate,
      createdAt: serverTimestamp() as unknown as Timestamp,
      status: "ACTIVE"
    };
    batch.set(donationRef, donation);

    // Mirror to feePayments for unified Payment History
    const paymentRef = doc(collection(db, "feePayments"));
    batch.set(paymentRef, {
      id: paymentRef.id,
      madrassaId,
      paymentNo: `DON-${donationRef.id.slice(-6).toUpperCase()}`,
      receiptNo: `DON-${donationRef.id.slice(-6).toUpperCase()}`,
      amount,
      paymentDate: dDate,
      paymentMethod,
      remarks: purpose ? `Donation from ${donorName} - ${purpose}` : `Donation from ${donorName}`,
      collectedBy: recordedByUid,
      status: "ACTIVE",
      transactionType: "DONATION",
      sourceId: donationRef.id,
      studentId: "N/A",
      parentId: "N/A",
      academicYearId: "N/A",
      feeCategoryId: "DONATION",
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return donation;
  },

  getDonationsByMadrassa: async (madrassaId: string): Promise<Donation[]> => {
    const q = query(collection(db, COLLECTION), where("madrassaId", "==", madrassaId));
    const snap = await getDocs(q);
    const donations = snap.docs.map(d => d.data() as Donation);
    return donations.sort((a, b) => {
      const dateA = a.date?.toMillis ? a.date.toMillis() : 0;
      const dateB = b.date?.toMillis ? b.date.toMillis() : 0;
      return dateB - dateA;
    });
  },

  getDonationsByAlumni: async (madrassaId: string, alumniId: string): Promise<Donation[]> => {
    const q = query(collection(db, COLLECTION), where("madrassaId", "==", madrassaId), where("alumniId", "==", alumniId));
    const snap = await getDocs(q);
    const donations = snap.docs.map(d => d.data() as Donation);
    return donations.sort((a, b) => {
      const dateA = a.date?.toMillis ? a.date.toMillis() : 0;
      const dateB = b.date?.toMillis ? b.date.toMillis() : 0;
      return dateB - dateA;
    });
  },

  deleteDonation: async (donationId: string): Promise<void> => {
    const ref = doc(db, COLLECTION, donationId);
    await deleteDoc(ref);
  }
};