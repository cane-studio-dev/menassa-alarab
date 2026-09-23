import {
  db, CATEGORIES, esc, catName, catCls, statusLabel, fmtMoney, renderHeader, renderFooter, progressBarHTML
} from "./common.js";
import {
  collection, query, where, orderBy, getDocs, getCountFromServer
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

renderHeader("home");
renderFooter();

let currentStatus = "open";
let currentCategory = "all";

// أزرار حالة المشروع
document.getElementById("statusTabs").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-s]");
  if (!btn) return;
  currentStatus = btn.dataset.s;
  document.querySelectorAll("#statusTabs button").forEach(b => b.classList.toggle("active", b === btn));
  loadProjects();
});

// فلاتر الأقسام
const catFilters = document.getElementById("catFilters");
CATEGORIES.forEach(c => {
  const span = document.createElement("span");
  span.className = "chip";
  span.dataset.c = c.id;
  span.textContent = c.name;
  catFilters.appendChild(span);
});
catFilters.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  currentCategory = chip.dataset.c;
  catFilters.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c === chip));
  loadProjects();
});

async function loadHeroStats() {
  const statsEl = document.getElementById("heroStats");
  try {
    const statuses = ["open", "ongoing", "completed"];
    const counts = await Promise.all(statuses.map(async s => {
      const q = query(collection(db, "projects"), where("status", "==", s));
      const snap = await getCountFromServer(q);
      return snap.data().count;
    }));
    statsEl.innerHTML = `
      <div class="stat"><b>${counts[0]}</b><span>مشروع مفتوح</span></div>
      <div class="stat"><b>${counts[1]}</b><span>قيد التنفيذ</span></div>
      <div class="stat"><b>${counts[2]}</b><span>مكتمل</span></div>
    `;
  } catch (e) {
    statsEl.innerHTML = "";
  }
}

async function loadProjects() {
  const grid = document.getElementById("projectsGrid");
  grid.innerHTML = `<div class="empty">جارِ تحميل المشاريع...</div>`;
  try {
    const q = query(
      collection(db, "projects"),
      where("status", "==", currentStatus),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    let list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    if (currentCategory !== "all") {
      list = list.filter(p => p.category === currentCategory);
    }
    if (list.length === 0) {
      grid.innerHTML = `<div class="empty">لا توجد مشاريع في هذا التصنيف حاليًا.</div>`;
      return;
    }
    grid.innerHTML = list.map(p => `
      <a href="project.html?id=${p.id}">
        <div class="card ${catCls(p.category)}">
          <span class="badge ${p.status}">${statusLabel(p.status)}</span>
          <h3 style="margin-top:10px;">${esc(p.title)}</h3>
          <span class="cat-label">${catName(p.category)} · بواسطة ${esc(p.ownerName || "")}</span>
          <p>${esc(p.desc)}</p>
          <div class="meta">
            <span class="budget">${fmtMoney(p.budget)}</span>
            <span>${p.duration} يوم</span>
          </div>
          ${p.status === "ongoing" ? progressBarHTML(p.progress) : ""}
        </div>
      </a>
    `).join("");
  } catch (e) {
    console.error(e);
    grid.innerHTML = `<div class="empty">حدث خطأ في تحميل المشاريع. تأكد من ضبط إعدادات Firebase في js/firebase-config.js وقواعد Firestore.</div>`;
  }
}

loadHeroStats();
loadProjects();
