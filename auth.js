import { auth, db, renderHeader, renderFooter, onReady } from "./common.js";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

renderHeader("home");
renderFooter();

// إن كان المستخدم مسجّل دخول بالفعل، حوّله للصفحة الرئيسية
onReady((user) => {
  if (user) window.location.href = "index.html";
});

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
const msgArea = document.getElementById("msgArea");

tabLogin.onclick = () => {
  loginForm.style.display = "block";
  signupForm.style.display = "none";
  tabLogin.className = "btn btn-primary";
  tabSignup.className = "btn btn-outline";
};
tabSignup.onclick = () => {
  loginForm.style.display = "none";
  signupForm.style.display = "block";
  tabLogin.className = "btn btn-outline";
  tabSignup.className = "btn btn-primary";
};

function showError(err) {
  msgArea.innerHTML = `<div class="error">${arabicError(err)}</div>`;
}
function arabicError(err) {
  const code = (err && err.code) || "";
  const map = {
    "auth/email-already-in-use": "هذا البريد الإلكتروني مسجّل بالفعل.",
    "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة.",
    "auth/weak-password": "كلمة المرور ضعيفة جدًا (6 أحرف على الأقل).",
    "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    "auth/user-not-found": "لا يوجد حساب بهذا البريد الإلكتروني.",
    "auth/wrong-password": "كلمة المرور غير صحيحة.",
  };
  return map[code] || ("حدث خطأ: " + (err && err.message ? err.message : "غير معروف"));
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  msgArea.innerHTML = "";
  const f = e.target;
  try {
    await signInWithEmailAndPassword(auth, f.email.value.trim(), f.password.value);
    window.location.href = "index.html";
  } catch (err) {
    showError(err);
  }
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  msgArea.innerHTML = "";
  const f = e.target;
  try {
    const cred = await createUserWithEmailAndPassword(auth, f.email.value.trim(), f.password.value);
    await setDoc(doc(db, "users", cred.user.uid), {
      name: f.name.value.trim(),
      email: f.email.value.trim(),
      isAdmin: false,
      banned: false,
      walletBalance: 0, // جاهز لربط مستقبلي بتوزيع الأرباح وسحب المستحقات
      createdAt: serverTimestamp(),
    });
    window.location.href = "index.html";
  } catch (err) {
    showError(err);
  }
});
