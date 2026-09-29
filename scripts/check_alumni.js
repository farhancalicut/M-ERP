const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = initializeApp();
const db = getFirestore();

async function main() {
  const usersRef = db.collection('users');
  const snap = await usersRef.where('role', '==', 'ALUMNI').limit(1).get();
  if (snap.empty) {
    console.log("No alumni found in users");
    return;
  }
  const user = snap.docs[0].data();
  console.log("Alumni user doc:", user);
}

main().catch(console.error);
