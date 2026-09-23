import { db, CATEGORIES, renderHeader, renderFooter, onReady } from "./common.js";
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

renderHeader("new");
renderFooter();

const content = document.getElementById("content");

onReady((user, userData) => {
  if (!user) {
    content.innerHTML = `<div class="notice">يجب تسجيل الدخول أولًا لإضافة مشروع. <a href="auth.html"><b>تسجيل الدخول / حساب جديد</b></a></div>`;
    return;
  }
  if (userData && userData.banned) {
    content.innerHTML = `<div class="notice">لا يمكنك نشر مشاريع جديدة لأن حسابك محظور حاليًا.</div>`;
    return;
  }

  content.innerHTML = `
    <h2>إضافة مشروع جديد</h2>
    <div id="formMsg"></div>
    <form id="newProjectForm">
      <label>عنوان المشروع</label>
      <input type="text" name="title" required placeholder="مثال: تصميم شعار لمشروع ناشئ">
      <label>وصف تفصيلي للمشروع</label>
      <textarea name="desc" required placeholder="اشرح المطلوب بالتفصيل، المهارات المطلوبة، وأي ملاحظات مهمة"></textarea>
      <div class="row2">
        <div><label>الميزانية (جنيه)</label><input type="number" name="budget" min="1" required placeholder="1000"></div>
        <div><label>مدة التنفيذ (بالأيام)</label><input type="number" name="duration" min="1" required placeholder="7"></div>
      </div>
      <label>القسم</label>
      <select class="full" name="category">
        ${CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
      </select>
      <div style="margin-top:18px;"><button class="btn btn-primary" type="submit">نشر المشروع</button></div>
    </form>
  `;

  document.getElementById("newProjectForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const formMsg = document.getElementById("formMsg");
    formMsg.innerHTML = "";
    try {
      const docRef = await addDoc(collection(db, "projects"), {
        title: f.title.value.trim(),
        desc: f.desc.value.trim(),
        budget: Number(f.budget.value),
        duration: Number(f.duration.value),
        category: f.category.value,
        ownerId: user.uid,
        ownerName: userData ? userData.name : "",
        status: "open",
        acceptedBidId: null,
        commissionPaid: false,
        commissionFlagged: false,
        createdAt: serverTimestamp(),
      });
      window.location.href = "project.html?id=" + docRef.id;
    } catch (err) {
      console.error(err);
      formMsg.innerHTML = `<div class="error">تعذّر نشر المشروع. تأكد من قواعد Firestore. (${err.message || ""})</div>`;
    }
  });
});
