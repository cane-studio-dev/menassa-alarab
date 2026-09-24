// ==========================================================
// أضف منتجاتك هنا. كل منتج له: id فريد، عنوان، وصف، سعر،
// صورة (رابط)، ورابط التحميل الذي سيُرسل تلقائياً للعميل بعد التسليم
// ==========================================================
const PRODUCTS = [
  {
    id: "p1",
    title: "سكربت متجر إلكتروني متكامل",
    description: "سكربت جاهز HTML/CSS/JS لإنشاء متجر إلكتروني بسرعة.",
    price: 150,
    currency: "جنيه",
    image: "https://images.unsplash.com/photo-1557821552-17105176677c?w=500&q=80",
    downloadLink: "https://drive.google.com/your-download-link-1"
  },
  {
    id: "p2",
    title: "قالب موقع شخصي احترافي",
    description: "تصميم عصري لموقع بورتفوليو شخصي، متجاوب بالكامل.",
    price: 90,
    currency: "جنيه",
    image: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=500&q=80",
    downloadLink: "https://drive.google.com/your-download-link-2"
  },
  {
    id: "p3",
    title: "أداة إدارة المهام (Task Manager)",
    description: "تطبيق ويب بسيط لتنظيم المهام اليومية بتصميم أنيق.",
    price: 120,
    currency: "جنيه",
    image: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=500&q=80",
    downloadLink: "https://drive.google.com/your-download-link-3"
  }
];

window.PRODUCTS = PRODUCTS;
