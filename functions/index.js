const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

function dateKeyFromTimestamp(ts) {
  const d = ts.toDate();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeGrade(g) {
  if (!g) return null;
  const s = String(g).trim().toLowerCase();
  const m = s.match(/(grade\s*)?(7|8|9|10|12)\b/);
  if (!m) return null;
  return `Grade ${m[2]}`;
}

exports.updateDailyStats = onDocumentCreated("inventory/{docId}", async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const grade = normalizeGrade(data.grade);
  const createdAt = data.createdAt;
  if (!grade || !createdAt) return;

  const dateKey = dateKeyFromTimestamp(createdAt);
  const ref = db.collection("stats_daily").doc(dateKey);

  await ref.set(
    {
      [grade]: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
});
