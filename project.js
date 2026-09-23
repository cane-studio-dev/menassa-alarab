import {
  db, esc, catName, catCls, statusLabel, fmtMoney, fmtTime, renderHeader, renderFooter, onReady,
  COMMISSION_RATE, DAILY_BID_LIMIT, progressBarHTML, initials, startOfToday
} from "./common.js";
import {
  doc, updateDoc, collection, addDoc, query, where, orderBy, onSnapshot,
  serverTimestamp, getCountFromServer, collectionGroup, Timestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

renderHeader("home");
renderFooter();

const content = document.getElementById("content");
const projectId = new URLSearchParams(location.search).get("id");

if (!projectId) {
  content.innerHTML = `<div class="empty">لم يتم تحديد مشروع.</div>`;
} else {
  let currentUser = null, currentUserData = null;
  let project = null, bids = [], chat = [];
  let dailyCount = null, fetchingDaily = false;
  let listenersAttached = false;

  onReady((user, userData) => {
    currentUser = user;
    currentUserData = userData;
    if (!listenersAttached) {
      listenersAttached = true;
      attachListeners();
    } else {
      dailyCount = null; // أعد الحساب إذا تغيّر المستخدم
      renderAll();
    }
  });

  function attachListeners() {
    onSnapshot(doc(db, "projects", projectId), (snap) => {
      project = snap.exists() ? { id: snap.id, ...snap.data() } : null;
      renderAll();
    });
    onSnapshot(query(collection(db, "projects", projectId, "bids"), orderBy("createdAt", "asc")), (snap) => {
      bids = [];
      snap.forEach(d => bids.push({ id: d.id, ...d.data() }));
      renderAll();
    });
    onSnapshot(query(collection(db, "projects", projectId, "chat"), orderBy("createdAt", "asc")), (snap) => {
      chat = [];
      snap.forEach(d => chat.push({ id: d.id, ...d.data() }));
      renderAll();
    });
  }

  async function fetchDailyCount(uid) {
    if (fetchingDaily) return;
    fetchingDaily = true;
    try {
      const qy = query(
        collectionGroup(db, "bids"),
        where("freelancerId", "==", uid),
        where("createdAt", ">=", Timestamp.fromDate(startOfToday()))
      );
      const snap = await getCountFromServer(qy);
      dailyCount = snap.data().count;
    } catch (e) {
      console.error(e);
      dailyCount = 0; // في حال عدم وجود الفهرس بعد، لا نمنع المستخدم
    }
    fetchingDaily = false;
    renderAll();
  }

  function renderAll() {
    if (project === null && !listenersAttached) return;
    if (project === null) {
      content.innerHTML = `<div class="empty">المشروع غير موجود أو تم حذفه.</div>`;
      return;
    }
    const p = project;
    const isOwner = currentUser && currentUser.uid === p.ownerId;
    const acceptedBid = bids.find(b => b.accepted);
    const myBid = currentUser ? bids.find(b => b.freelancerId === currentUser.uid) : null;
    const canBidStructurally = currentUser && !isOwner && p.status === "open" && !myBid && currentUserData && !currentUserData.banned;

    if (canBidStructurally && dailyCount === null) {
      fetchDailyCount(currentUser.uid);
    }

    let html = `
    <div class="panel">
      <span class="badge ${p.status}">${statusLabel(p.status)}</span>
      <h2 style="margin:12px 0 4px;">${esc(p.title)}</h2>
      <span class="cat-label">${catName(p.category)} · صاحب المشروع: ${esc(p.ownerName || "")}</span>
      <p style="margin-top:14px;">${esc(p.desc)}</p>
      <div class="meta" style="margin-top:10px;">
        <span class="budget">${fmtMoney(p.budget)}</span>
        <span>مدة التنفيذ: ${p.duration} يوم</span>
      </div>
      ${p.status === "ongoing" ? progressBarHTML(p.progress) : ""}
    </div>`;

    // إدارة نسبة الإنجاز
    if (p.status === "ongoing" && (isOwner || (acceptedBid && currentUser && acceptedBid.freelancerId === currentUser.uid))) {
      html += `
      <div class="panel">
        <h2>تحديث نسبة الإنجاز</h2>
        <input type="range" id="progressRange" min="0" max="100" step="5" value="${p.progress || 0}">
        <div class="progress-label"><span>0%</span><span id="progressVal">${p.progress || 0}%</span><span>100%</span></div>
        <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" id="saveProgressBtn">حفظ النسبة</button>
          ${isOwner ? `<button class="btn btn-gold btn-sm" id="markCompleteBtn">تأكيد إتمام المشروع</button>` : ""}
        </div>
      </div>`;
    }

    // العروض
    html += `<div class="panel"><h2>العروض المقدَّمة (${bids.length})</h2>`;
    if (bids.length === 0) {
      html += `<div class="empty">لا توجد عروض بعد.</div>`;
    } else {
      html += bids.map(b => `
        <div class="bid-item ${b.accepted ? "accepted" : ""} ${b.status === "rejected" ? "rejected" : ""}">
          <div class="top">
            <span class="name"><span class="avatar">${esc(initials(b.freelancerName))}</span> ${esc(b.freelancerName)}</span>
            <span class="amount">${fmtMoney(b.amount)} · ${b.days} يوم</span>
          </div>
          <div style="font-size:13.5px;color:var(--ink-soft);">${esc(b.details)}</div>
          ${b.accepted ? `<div style="margin-top:8px;"><span class="pill ok">العرض المقبول</span></div>` : ""}
          ${b.status === "rejected" ? `<div style="margin-top:8px;"><span class="pill warn">غير مقبول</span></div>` : ""}
          ${isOwner && p.status === "open" && !b.accepted && b.status !== "rejected" ? `
            <div class="bid-actions">
              <button class="btn btn-primary btn-sm" data-accept="${b.id}">قبول العرض</button>
              <button class="btn btn-outline btn-sm" data-reject="${b.id}">رفض</button>
            </div>` : ""}
        </div>
      `).join("");
    }

    if (!currentUser) {
      html += `<div class="notice" style="margin-top:14px;">سجّل الدخول لتتمكن من تقديم عرض على هذا المشروع. <a href="auth.html"><b>تسجيل الدخول</b></a></div>`;
    } else if (canBidStructurally) {
      if (dailyCount !== null && dailyCount >= DAILY_BID_LIMIT) {
        html += `<div class="notice" style="margin-top:16px;">لقد استخدمت حد الـ ${DAILY_BID_LIMIT} عروض المسموح بها اليوم. حاول مرة أخرى غدًا.</div>`;
      } else {
        html += `
        <div style="margin-top:18px;border-top:1px solid var(--border-soft);padding-top:16px;">
          <h3 style="margin:0 0 8px;font-size:15px;">تقديم عرضك ${dailyCount !== null ? `<span class="soon-badge">${dailyCount}/${DAILY_BID_LIMIT} اليوم</span>` : ""}</h3>
          <form id="bidForm">
            <div class="row2">
              <div><label>قيمة العرض (جنيه)</label><input type="number" name="amount" min="1" required></div>
              <div><label>مدة التسليم (يوم)</label><input type="number" name="days" min="1" required></div>
            </div>
            <label>تفاصيل العرض</label>
            <textarea name="details" required placeholder="اشرح خبرتك وكيف ستنفذ المشروع"></textarea>
            <div style="margin-top:12px;"><button class="btn btn-primary" type="submit">إرسال العرض</button></div>
          </form>
        </div>`;
      }
    } else if (myBid) {
      html += `<div class="notice" style="margin-top:14px;">لقد قدّمت عرضًا بالفعل على هذا المشروع.</div>`;
    } else if (currentUserData && currentUserData.banned) {
      html += `<div class="notice" style="margin-top:14px;">لا يمكنك تقديم عروض لأن حسابك محظور حاليًا.</div>`;
    }
    html += `</div>`;

    // العمولة عند الإتمام
    if (p.status === "completed" && acceptedBid) {
      const commissionDue = Math.round(acceptedBid.amount * COMMISSION_RATE);
      const isFreelancer = currentUser && acceptedBid.freelancerId === currentUser.uid;
      html += `<div class="panel">
        <h2>تسوية عمولة المنصة</h2>
        <p style="font-size:13.5px;color:var(--ink-soft);">
          عمولة المنصة المستحقة على هذا المشروع: <b>${fmtMoney(commissionDue)}</b> (5% من قيمة العرض المقبول)،
          مستحقة على المستقل ${esc(acceptedBid.freelancerName)}. يتم تنسيق السداد يدويًا مباشرة، وتؤكد إدارة المنصة استلامها من لوحة التحكم.
        </p>
        <span class="pill ${p.commissionPaid ? "ok" : "warn"}">${p.commissionPaid ? "تم سداد العمولة" : "لم يتم السداد بعد"}</span>
        ${isFreelancer ? `<div style="margin-top:14px;"><button class="btn btn-outline btn-sm" disabled>طلب سحب الأرباح <span class="soon-badge">قريبًا</span></button></div>` : ""}
      </div>`;
    }

    // الدردشة
    const canChat = currentUser && (isOwner || (acceptedBid && acceptedBid.freelancerId === currentUser.uid));
    if (p.status !== "open" || isOwner) {
      html += `<div class="panel">
        <h2>الدردشة الخاصة بالمشروع</h2>
        <p style="font-size:12.5px;color:var(--ink-soft);margin-top:-8px;">اتفقا هنا على تفاصيل التنفيذ، وتبادلا رقم المحفظة الإلكترونية (مثل فودافون كاش) لإتمام التحويل المالي مباشرة بينكما.</p>
        <div class="chat-box">
          ${chat.length === 0 ? `<div class="empty" style="padding:20px;">لا توجد رسائل بعد.</div>` :
            chat.map(m => `
              <div class="chat-msg ${m.wallet ? "wallet" : ""}">
                <span class="time">${fmtTime(m.createdAt)}</span>
                <div class="from">${esc(m.fromName)} ${m.wallet ? "· رقم محفظة" : ""}</div>
                <div>${esc(m.text)}</div>
              </div>
            `).join("")}
        </div>
        ${canChat ? `
          <form id="chatForm" class="chat-input-row" style="margin-bottom:8px;">
            <input type="text" name="msg" placeholder="اكتب رسالة..." required>
            <button class="btn btn-primary btn-sm" type="submit">إرسال</button>
          </form>
          <form id="walletForm" class="chat-input-row">
            <input type="text" name="msg" placeholder="مثال: رقم محفظتي فودافون كاش هو 010xxxxxxxx">
            <button class="btn btn-gold btn-sm" type="submit">إرسال كرقم محفظة</button>
          </form>
        ` : `<div class="empty" style="padding:10px;">الدردشة متاحة فقط لصاحب المشروع والمستقل صاحب العرض المقبول.</div>`}
      </div>`;
    }

    content.innerHTML = html;
    bindEvents();
  }

  function bindEvents() {
    const bidForm = document.getElementById("bidForm");
    if (bidForm) bidForm.addEventListener("submit", submitBid);

    const chatForm = document.getElementById("chatForm");
    if (chatForm) chatForm.addEventListener("submit", (e) => sendChat(e, false));

    const walletForm = document.getElementById("walletForm");
    if (walletForm) walletForm.addEventListener("submit", (e) => sendChat(e, true));

    content.querySelectorAll("[data-accept]").forEach(btn => {
      btn.addEventListener("click", () => acceptBid(btn.dataset.accept));
    });
    content.querySelectorAll("[data-reject]").forEach(btn => {
      btn.addEventListener("click", () => rejectBid(btn.dataset.reject));
    });

    const progressRange = document.getElementById("progressRange");
    if (progressRange) {
      progressRange.addEventListener("input", () => {
        document.getElementById("progressVal").textContent = progressRange.value + "%";
      });
    }
    const saveProgressBtn = document.getElementById("saveProgressBtn");
    if (saveProgressBtn) {
      saveProgressBtn.addEventListener("click", async () => {
        const val = Number(document.getElementById("progressRange").value);
        await updateDoc(doc(db, "projects", projectId), { progress: val });
      });
    }
    const markCompleteBtn = document.getElementById("markCompleteBtn");
    if (markCompleteBtn) {
      markCompleteBtn.addEventListener("click", async () => {
        await updateDoc(doc(db, "projects", projectId), { status: "completed", progress: 100 });
      });
    }
  }

  async function submitBid(e) {
    e.preventDefault();
    const f = e.target;
    if (dailyCount !== null && dailyCount >= DAILY_BID_LIMIT) return;
    try {
      await addDoc(collection(db, "projects", projectId, "bids"), {
        freelancerId: currentUser.uid,
        freelancerName: currentUserData ? currentUserData.name : "",
        amount: Number(f.amount.value),
        days: Number(f.days.value),
        details: f.details.value.trim(),
        accepted: false,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      dailyCount = (dailyCount || 0) + 1;
    } catch (err) {
      alert("تعذّر إرسال العرض: " + (err.message || ""));
    }
  }

  async function acceptBid(bidId) {
    try {
      await updateDoc(doc(db, "projects", projectId), { status: "ongoing", acceptedBidId: bidId, progress: 0 });
      await updateDoc(doc(db, "projects", projectId, "bids", bidId), { accepted: true, status: "accepted" });
      await Promise.all(bids.filter(b => b.id !== bidId && b.status !== "rejected").map(b =>
        updateDoc(doc(db, "projects", projectId, "bids", b.id), { status: "rejected" })
      ));
    } catch (err) {
      alert("تعذّر قبول العرض: " + (err.message || ""));
    }
  }

  async function rejectBid(bidId) {
    try {
      await updateDoc(doc(db, "projects", projectId, "bids", bidId), { status: "rejected" });
    } catch (err) {
      alert("تعذّر رفض العرض: " + (err.message || ""));
    }
  }

  async function sendChat(e, wallet) {
    e.preventDefault();
    const f = e.target;
    const text = f.msg.value.trim();
    if (!text) return;
    try {
      await addDoc(collection(db, "projects", projectId, "chat"), {
        from: currentUser.uid,
        fromName: currentUserData ? currentUserData.name : "",
        text,
        wallet: !!wallet,
        createdAt: serverTimestamp(),
      });
      f.msg.value = "";
    } catch (err) {
      alert("تعذّر إرسال الرسالة: " + (err.message || ""));
    }
  }
}
