import {
  db, esc, fmtMoney, renderHeader, renderFooter, onReady, COMMISSION_RATE
} from "./common.js";
import {
  collection, getDocs, doc, updateDoc, query, where, getCountFromServer
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

renderHeader("admin");
renderFooter();

const content = document.getElementById("content");

onReady((user, userData) => {
  if (!user || !userData || !userData.isAdmin) {
    content.innerHTML = `<div class="empty">هذه الصفحة مخصصة لإدارة المنصة فقط.</div>`;
    return;
  }
  loadDashboard();
});

async function loadDashboard() {
  content.innerHTML = `<div class="empty">جارِ تحميل بيانات لوحة التحكم...</div>`;

  const [usersSnap, projectsSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "projects")),
  ]);

  const users = [];
  usersSnap.forEach(d => users.push({ id: d.id, ...d.data() }));
  const projects = [];
  projectsSnap.forEach(d => projects.push({ id: d.id, ...d.data() }));

  // عدد المشاريع والعروض لكل مستخدم
  const projCountByUser = {};
  projects.forEach(p => { projCountByUser[p.ownerId] = (projCountByUser[p.ownerId] || 0) + 1; });

  let bidCountByUser = {};
  await Promise.all(projects.map(async p => {
    const bidsSnap = await getDocs(collection(db, "projects", p.id, "bids"));
    p._bids = [];
    bidsSnap.forEach(b => p._bids.push({ id: b.id, ...b.data() }));
    p._bids.forEach(b => { bidCountByUser[b.freelancerId] = (bidCountByUser[b.freelancerId] || 0) + 1; });
  }));

  const completedProjects = projects.filter(p => p.status === "completed");
  const totalDue = completedProjects.reduce((s, p) => {
    const b = (p._bids || []).find(b => b.accepted);
    return s + (b && !p.commissionPaid ? Math.round(b.amount * COMMISSION_RATE) : 0);
  }, 0);

  let html = `
  <div class="hero">
    <div>
      <h1>لوحة تحكم الأدمن</h1>
      <p>متابعة نشاط المستخدمين، العروض، والعمولات المستحقة، مع صلاحية حظر أي حساب يتهرب من سداد نسبة المنصة.</p>
    </div>
    <div class="hero-stats">
      <div class="stat"><b>${users.length}</b><span>مستخدم</span></div>
      <div class="stat"><b>${projects.length}</b><span>مشروع</span></div>
      <div class="stat"><b>${projects.reduce((s, p) => s + ((p._bids || []).length), 0)}</b><span>عرض مقدَّم</span></div>
      <div class="stat"><b>${fmtMoney(totalDue)}</b><span>عمولات مستحقة</span></div>
    </div>
  </div>

  <div class="panel">
    <h2>المستخدمون</h2>
    <div style="overflow-x:auto;">
    <table>
      <thead><tr><th>الاسم</th><th>البريد الإلكتروني</th><th>عدد المشاريع</th><th>عدد العروض</th><th>الحالة</th><th>إجراء</th></tr></thead>
      <tbody>
        ${users.map(u => `
          <tr class="${u.banned ? "banned" : ""}">
            <td>${esc(u.name)}</td>
            <td>${esc(u.email || "")}</td>
            <td>${projCountByUser[u.id] || 0}</td>
            <td>${bidCountByUser[u.id] || 0}</td>
            <td>${u.banned ? '<span class="pill warn">محظور</span>' : '<span class="pill ok">نشط</span>'}</td>
            <td>
              ${u.isAdmin ? "—" : (u.banned
                ? `<button class="btn btn-outline btn-sm" data-unban="${u.id}">إلغاء الحظر</button>`
                : `<button class="btn btn-danger btn-sm" data-ban="${u.id}">إغلاق وحظر الحساب نهائيًا</button>`)}
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    </div>
  </div>

  <div class="panel">
    <h2>متابعة عمولات المشاريع المكتملة (5%)</h2>`;

  if (completedProjects.length === 0) {
    html += `<div class="empty">لا توجد مشاريع مكتملة بعد.</div>`;
  } else {
    html += `<div style="overflow-x:auto;"><table>
      <thead><tr><th>المشروع</th><th>المستقل</th><th>قيمة العرض</th><th>العمولة (5%)</th><th>الحالة</th><th>إجراء</th></tr></thead>
      <tbody>
        ${completedProjects.map(p => {
          const b = (p._bids || []).find(b => b.accepted);
          if (!b) return "";
          const commission = Math.round(b.amount * COMMISSION_RATE);
          return `
          <tr>
            <td>${esc(p.title)}</td>
            <td>${esc(b.freelancerName)}</td>
            <td>${fmtMoney(b.amount)}</td>
            <td>${fmtMoney(commission)}</td>
            <td>${p.commissionPaid ? '<span class="pill ok">مسدّدة</span>' : (p.commissionFlagged ? '<span class="pill warn">تهرّب مؤكّد</span>' : '<span class="pill warn">غير مسدّدة</span>')}</td>
            <td style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn btn-outline btn-sm" data-toggle-paid="${p.id}">${p.commissionPaid ? "تراجع" : "تأكيد السداد"}</button>
              ${!p.commissionPaid ? `<button class="btn btn-danger btn-sm" data-flag="${p.id}">تسجيل تهرّب</button>` : ""}
            </td>
          </tr>`;
        }).join("")}
      </tbody>
    </table></div>`;
  }
  html += `</div>`;

  content.innerHTML = html;

  content.querySelectorAll("[data-ban]").forEach(btn => btn.addEventListener("click", () => banUser(btn.dataset.ban)));
  content.querySelectorAll("[data-unban]").forEach(btn => btn.addEventListener("click", () => unbanUser(btn.dataset.unban)));
  content.querySelectorAll("[data-toggle-paid]").forEach(btn => btn.addEventListener("click", () => togglePaid(btn.dataset.togglePaid, completedProjects)));
  content.querySelectorAll("[data-flag]").forEach(btn => btn.addEventListener("click", () => flagEvasion(btn.dataset.flag)));
}

async function banUser(uid) {
  if (!confirm("هل أنت متأكد من إغلاق وحظر هذا الحساب نهائيًا؟ هذا الإجراء لا يمكن التراجع عنه بسهولة.")) return;
  await updateDoc(doc(db, "users", uid), { banned: true });
  loadDashboard();
}
async function unbanUser(uid) {
  await updateDoc(doc(db, "users", uid), { banned: false });
  loadDashboard();
}
async function togglePaid(projectId, completedProjects) {
  const p = completedProjects.find(p => p.id === projectId);
  await updateDoc(doc(db, "projects", projectId), { commissionPaid: !p.commissionPaid, commissionFlagged: false });
  loadDashboard();
}
async function flagEvasion(projectId) {
  await updateDoc(doc(db, "projects", projectId), { commissionFlagged: true });
  loadDashboard();
}
