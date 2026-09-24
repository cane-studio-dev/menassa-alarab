const grid = document.getElementById("productsGrid");
PRODUCTS.forEach(p => {
  const card = document.createElement("div");
  card.className = "product-card";
  card.innerHTML = `
    <img src="${p.image}" alt="${p.title}">
    <div class="product-body">
      <h3>${p.title}</h3>
      <p>${p.description}</p>
      <div class="product-footer">
        <span class="price-tag">${p.price} ${p.currency}</span>
        <button class="btn btn-gold btn-sm buy-btn" data-id="${p.id}">اشترِ الآن</button>
      </div>
    </div>
  `;
  grid.appendChild(card);
});

const modal = document.getElementById("buyModal");
const modalTitle = document.getElementById("modalProductTitle");
const modalPrice = document.getElementById("modalProductPrice");
const orderProductId = document.getElementById("orderProductId");
const orderForm = document.getElementById("orderForm");
const orderStatusMsg = document.getElementById("orderStatusMsg");

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("buy-btn")) {
    const id = e.target.dataset.id;
    const product = PRODUCTS.find(p => p.id === id);
    modalTitle.textContent = product.title;
    modalPrice.textContent = `${product.price} ${product.currency}`;
    orderStatusMsg.textContent = "";
    orderForm.reset();
    orderProductId.value = product.id;
    modal.classList.add("active");
  }
});

document.getElementById("closeModal").addEventListener("click", () => modal.classList.remove("active"));
modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("active"); });

document.getElementById("copyNumberBtn").addEventListener("click", () => {
  navigator.clipboard.writeText(document.getElementById("paymentNumber").textContent.trim());
  const btn = document.getElementById("copyNumberBtn");
  btn.textContent = "تم النسخ ✓";
  setTimeout(() => (btn.textContent = "نسخ الرقم"), 1500);
});

function getOrders() {
  return JSON.parse(localStorage.getItem("orders") || "[]");
}
function saveOrders(orders) {
  localStorage.setItem("orders", JSON.stringify(orders));
}

orderForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const productId = orderProductId.value;
  const product = PRODUCTS.find(p => p.id === productId);

  const order = {
    id: "ord_" + Date.now(),
    productId: productId,
    productTitle: product.title,
    price: product.price,
    phone: document.getElementById("customerPhone").value,
    email: document.getElementById("customerEmail").value,
    transferDetails: document.getElementById("transferDetails").value,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);

  orderStatusMsg.style.color = "#4caf50";
  orderStatusMsg.textContent = "تم إرسال طلبك بنجاح! سيصلك رابط التحميل على بريدك بعد تأكيد الدفع.";
  orderForm.reset();
  setTimeout(() => modal.classList.remove("active"), 2000);
});
