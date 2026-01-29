import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

console.log("✅ test_write.js loaded");

window.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("submitBtn");
  if (!btn) {
    alert("❌ submitBtn not found. Check your button id.");
    return;
  }

  btn.addEventListener("click", async () => {
    try {
      console.log("✅ Submit clicked, writing to Firestore...");
      await addDoc(collection(db, "inventory"), {
        name: "TEST STUDENT",
        targetGrade: "Grade 9",
        targetSection: "AZURE",
        createdAt: serverTimestamp()
      });
      alert("✅ SUCCESS! Nakasulat sa Firebase.");
    } catch (e) {
      console.error(e);
      alert("❌ FIREBASE WRITE FAILED. Open console (F12).");
    }
  });
});
