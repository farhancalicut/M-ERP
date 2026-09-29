import { collection, doc, getDocs, getDoc, query, where, orderBy, setDoc, updateDoc, serverTimestamp, Timestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { DonationPledge } from "@/types/schema";
import { donationService } from "./donationService";
import { alumniService } from "@/features/promotion/services/alumniService";

const COLLECTION = "donationPledges";

export const pledgeService = {
  createPledge: async (
    madrassaId: string,
    alumniId: string,
    amount: number,
    paymentMethod: "BANK" | "UPI" | "OTHER",
    transactionId: string,
    purpose?: string
  ): Promise<DonationPledge> => {
    const pledgeRef = doc(collection(db, COLLECTION));
    const pledge: DonationPledge = {
      id: pledgeRef.id,
      madrassaId,
      alumniId,
      amount,
      paymentMethod,
      transactionId,
      purpose: purpose || "",
      status: "PENDING",
      date: Timestamp.now(),
      createdAt: serverTimestamp() as unknown as Timestamp,
    };
    await setDoc(pledgeRef, pledge);
    return pledge;
  },

  getAlumniPledges: async (madrassaId: string, alumniId: string): Promise<DonationPledge[]> => {
    const q = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", madrassaId),
      where("alumniId", "==", alumniId),
      orderBy("date", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as DonationPledge);
  },

  getPendingPledges: async (madrassaId: string): Promise<DonationPledge[]> => {
    const q = query(
      collection(db, COLLECTION),
      where("madrassaId", "==", madrassaId),
      where("status", "==", "PENDING"),
      orderBy("date", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as DonationPledge);
  },

  approvePledge: async (pledgeId: string, madrassaId: string, processedBy: string): Promise<void> => {
    const pledgeRef = doc(db, COLLECTION, pledgeId);
    const pledgeSnap = await getDoc(pledgeRef);
    if (!pledgeSnap.exists()) throw new Error("Pledge not found");
    const pledge = pledgeSnap.data() as DonationPledge;

    if (pledge.status !== "PENDING") throw new Error("Pledge is already processed");

    // Fetch Alumni details for the donation record
    const alumni = await alumniService.getAlumniProfile(pledge.alumniId);
    if (!alumni) throw new Error("Alumni not found");

    const batch = writeBatch(db);

    // 1. Update Pledge Status
    batch.update(pledgeRef, {
      status: "APPROVED",
      processedBy,
      processedAt: serverTimestamp()
    });

    // 2. Create actual Donation and feePayment
    const donationRef = doc(collection(db, "donations"));
    batch.set(donationRef, {
      id: donationRef.id,
      madrassaId,
      donorName: alumni.name,
      donorContact: alumni.mobile || "",
      purpose: pledge.purpose || "Alumni Donation",
      amount: pledge.amount,
      paymentMethod: pledge.paymentMethod,
      recordedBy: processedBy,
      alumniId: pledge.alumniId,
      date: pledge.date,
      createdAt: serverTimestamp(),
      status: "ACTIVE"
    });

    const paymentRef = doc(collection(db, "feePayments"));
    batch.set(paymentRef, {
      id: paymentRef.id,
      madrassaId,
      paymentNo: `DON-${donationRef.id.slice(-6).toUpperCase()}`,
      receiptNo: `DON-${donationRef.id.slice(-6).toUpperCase()}`,
      amount: pledge.amount,
      paymentDate: pledge.date,
      paymentMethod: pledge.paymentMethod,
      remarks: pledge.purpose ? `Alumni Donation: ${pledge.purpose} (Tx: ${pledge.transactionId})` : `Alumni Donation (Tx: ${pledge.transactionId})`,
      collectedBy: processedBy,
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
  },

  rejectPledge: async (pledgeId: string, processedBy: string): Promise<void> => {
    const pledgeRef = doc(db, COLLECTION, pledgeId);
    await updateDoc(pledgeRef, {
      status: "REJECTED",
      processedBy,
      processedAt: serverTimestamp()
    });
  }
};
