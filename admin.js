const loginBox = document.getElementById("loginBox");
const adminPanel = document.getElementById("adminPanel");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginError = document.getElementById("loginError");
const ordersBody = document.getElementById("ordersBody");

function isLoggedIn() {
  return sessionStorage.getItem("adminLoggedIn") === "1";
}
function renderAuthState() {
  if (isLoggedIn()) {
    loginBox.style.display = "none";
    adminPanel.style.display = "block";
    renderOrders();
  } else {
    loginBox.style.display = "block";
    adminPanel.style.display = "none";
  }
}

loginBtn.addEventListener("click", () => {
  const password = document.getElementById("adminPassword").value;
  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem("adminLoggedIn", "1");
    renderAuthState();
  } else {
    loginError.textContent = "كلمة المرور غير صحيحة.";
  }
});

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("adminLoggedIn");
  renderAuthState();
});

function getOrders() {
  return JSON.parse(localStorage.getItem("orders") || "[]");
}
function saveOrders(orders) {
  localStorage.setItem("orders", JSON.stringify(orders));
}

function renderOrders() {
  const orders = getOrders();
  ordersBody.innerHTML = "";
  orders.forEach(order => {
    const date = new Date(order.createdAt).toLocaleString("ar-EG");
    const statusClass = order.status === "delivered" ? "status-delivered" : "status-pending";
    const statusText = order.status === "delivered" ? "تم التسليم ✓" : "قيد الانتظار";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${date}</td>
      <td>${order.productTitle}</td>
      <td>${order.phone}</td>
      <td>${order.email}</td>
      <td class="wrap">${order.transferDetails}</td>
      <td class="${statusClass}">${statusText}</td>
      <td>${order.status === "delivered"
        ? "—"
        : `<button class="btn btn-gold btn-sm deliver-btn" data-id="${order.id}">تسليم الآن</button>`}
      </td>
    `;
    ordersBody.appendChild(row);
  });
}

ordersBody.addEventListener("click", (e) => {
  if (!e.target.classList.contains("deliver-btn")) return;
  const orderId = e.target.dataset.id;
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  const product = PRODUCTS.find(p => p.id === order.productId);

  const subject = encodeURIComponent("رابط تحميل منتجك: " + order.productTitle);
  const body = encodeURIComponent("شكراً لشرائك " + order.productTitle + "\n\nرابط التحميل:\n" + (product ? product.downloadLink : ""));
  window.location.href = `mailto:${order.email}?subject=${subject}&body=${body}`;

  order.status = "delivered";
  saveOrders(orders);
  renderOrders();
});

renderAuthState();
