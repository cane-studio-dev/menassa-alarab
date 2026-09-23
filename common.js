// =======================================================================
// common.js — تهيئة Firebase + عناصر مشتركة (الهيدر والفوتر) لكل الصفحات
// =======================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const COMMISSION_RATE = 0.05;
export const DAILY_BID_LIMIT = 3; // كل مستقل يقدّم حتى 3 عروض يوميًا، بدون نظام نقاط

export const CATEGORIES = [
  { id: "dev", name: "برمجة وتطوير الويب" },
  { id: "design", name: "تصميم جرافيك" },
  { id: "writing", name: "كتابة المحتوى" },
  { id: "marketing", name: "التسويق الإلكتروني" },
  { id: "translate", name: "الترجمة" },
  { id: "video", name: "الفيديو والمونتاج" },
  { id: "admin", name: "أعمال إدارية" },
];

const CAT_CLASS = {
  dev: "", design: "cat-design", writing: "cat-writing",
  marketing: "cat-marketing", translate: "cat-translate",
  video: "cat-video", admin: "cat-admin",
};

export function esc(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, m => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]
  ));
}
export function catName(id) {
  const c = CATEGORIES.find(c => c.id === id);
  return c ? c.name : id;
}
export function catCls(id) { return CAT_CLASS[id] || ""; }
export function statusLabel(s) {
  return s === "open" ? "مفتوح" : (s === "ongoing" ? "قيد التنفيذ" : "منتهي");
}
export function fmtMoney(n) {
  return Number(n || 0).toLocaleString("ar-EG") + " ج.م";
}
export function fmtTime(ts) {
  if (!ts || !ts.toDate) return "";
  return ts.toDate().toLocaleString("ar-EG", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}
export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
export function progressBarHTML(pct) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  return `
    <div class="progress-wrap">
      <div class="progress-track"><div class="progress-fill" style="width:${p}%"></div></div>
      <div class="progress-label"><span>نسبة الإنجاز</span><span>${p}%</span></div>
    </div>`;
}
export function bidStatusLabel(bid) {
  if (bid.accepted) return "مقبول";
  if (bid.status === "rejected") return "مرفوض";
  return "قيد المراجعة";
}
export function initials(name) {
  const n = (name || "؟").trim();
  return n.slice(0, 1).toUpperCase();
}

// جلب مستند المستخدم من Firestore (يحتوي isAdmin و banned و name)
export async function getUserData(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

// ينادَى مرة واحدة في كل صفحة: يعطيك المستخدم الحالي وبياناته بعد جاهزية Firebase
export function onReady(callback) {
  onAuthStateChanged(auth, async (user) => {
    let userData = null;
    if (user) {
      userData = await getUserData(user.uid);
    }
    callback(user, userData);
  });
}

export async function logout() {
  await signOut(auth);
  window.location.href = "index.html";
}

// يرسم الهيدر (الشعار + التبويبات + منطقة المستخدم) في العنصر #siteHeader
// activePage: 'home' | 'new' | 'admin'
export function renderHeader(activePage) {
  const header = document.getElementById("siteHeader");
  if (!header) return;
  header.innerHTML = `
    <div class="topbar wrap">
      <a href="index.html" class="brand"><span class="dot"></span> منصة العرب</a>
      <div class="nav-user" id="navUserArea">جارِ التحميل...</div>
    </div>
    <nav class="tabs">
      <div class="wrap-tabs" id="navTabsArea"></div>
    </nav>
  `;

  onReady((user, userData) => {
    const navUserArea = document.getElementById("navUserArea");
    const navTabsArea = document.getElementById("navTabsArea");

    if (user && userData) {
      navUserArea.innerHTML = `
        <span>${esc(userData.name)} ${userData.isAdmin ? "· أدمن" : ""}</span>
        <button class="btn btn-outline btn-sm" id="logoutBtn">تسجيل الخروج</button>
      `;
      document.getElementById("logoutBtn").onclick = logout;
      if (userData.banned) {
        const notice = document.createElement("div");
        notice.className = "wrap";
        notice.innerHTML = `<div class="notice" style="margin-top:14px;">حسابك محظور حاليًا بسبب عدم سداد نسبة المنصة على مشروع سابق. راسل إدارة المنصة لإعادة التفعيل.</div>`;
        header.appendChild(notice);
      }
    } else {
      navUserArea.innerHTML = `<a href="auth.html"><button class="btn btn-primary btn-sm">تسجيل الدخول / حساب جديد</button></a>`;
    }

    const tabs = [
      { id: "home", label: "تصفح المشاريع", href: "index.html" },
      { id: "new", label: "إضافة مشروع جديد", href: "new-project.html" },
    ];
    if (userData && userData.isAdmin) {
      tabs.push({ id: "admin", label: "لوحة تحكم الأدمن", href: "admin.html" });
    }
    navTabsArea.innerHTML = tabs.map(t =>
      `<a href="${t.href}"><button class="tab ${activePage === t.id ? "active" : ""}">${t.label}</button></a>`
    ).join("");
  });
}

export function renderFooter() {
  const footer = document.getElementById("siteFooter");
  if (!footer) return;
  footer.innerHTML = `
    <div class="wrap">
      <div>
        <h4>من نحن — منصة العرب</h4>
        <p>منصة العرب سوق عمل حر عربي مصمم للشباب العربي، لتسهيل الوصول إلى فرص العمل الحر دون تعقيدات توثيق الهوية المرهقة. التسجيل ببريد إلكتروني وكلمة مرور فقط، وبعدها ابدأ في نشر مشروعك أو تقديم عروضك.</p>
      </div>
      <div>
        <h4>كيف يتم الدفع؟</h4>
        <div class="commission-box">
          <p style="margin:0 0 6px;">التنسيق المالي يتم يدويًا ومباشرة بين الطرفين عبر الدردشة الداخلية لكل مشروع (مثل تبادل رقم محفظة فودافون كاش)، بدون أي بوابة دفع إلكتروني وسيطة.</p>
          <p style="margin:0;color:#E7B8B0;">نسبة المنصة 5% مستحقة على المستقل عند إتمام كل مشروع. التهرب المتكرر من سدادها يعرّض الحساب للإغلاق والحظر النهائي.</p>
        </div>
      </div>
      <div>
        <h4>روابط سريعة</h4>
        <ul>
          <li onclick="location.href='index.html'">تصفح المشاريع</li>
          <li onclick="location.href='new-project.html'">إضافة مشروع</li>
          <li onclick="location.href='auth.html'">تسجيل الدخول / حساب جديد</li>
        </ul>
      </div>
    </div>
    <div class="foot-bottom wrap">© منصة العرب</div>
  `;
}
