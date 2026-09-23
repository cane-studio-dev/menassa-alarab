# منصة العرب — دليل التشغيل والرفع

منصة عمل حر عربية متكاملة (تصفح مشاريع، عروض، دردشة داخلية، لوحة تحكم أدمن)
مبنية بملفات HTML/CSS/JS عادية (بدون أي إطار عمل) وتُخزَّن بياناتها الحقيقية على
**Firebase (Firestore + Authentication)**، وجاهزة للرفع مباشرة على **GitHub Pages**.

لا توجد أي بوابة دفع إلكتروني في الكود — كل التحويلات المالية تتم يدويًا بين
المستخدمين عبر الدردشة الداخلية (مثل تبادل رقم فودافون كاش)، مع تتبع نسبة
المنصة (5%) يدويًا من لوحة تحكم الأدمن.

---

## 1) إنشاء مشروع Firebase (5 دقائق)

1. افتح https://console.firebase.google.com وسجّل الدخول بحساب Google.
2. اضغط **"إضافة مشروع" (Add project)**، اختر اسمًا (مثلاً `menassa-alarab`)، وأكمل الخطوات (يمكنك إيقاف Google Analytics، غير ضروري).
3. من القائمة الجانبية: **Build → Authentication → Get started**.
   - في تبويب **Sign-in method**، فعّل **Email/Password** فقط، واحفظ.
4. من القائمة الجانبية: **Build → Firestore Database → Create database**.
   - اختر **Start in production mode** (سنضع القواعد بأنفسنا في الخطوة 3 بالأسفل).
   - اختر أقرب منطقة (مثلاً `eur3` أو `me-central1` إن توفرت)، ثم Enable.

## 2) الحصول على مفاتيح المشروع (Firebase Config)

1. من القائمة الجانبية اضغط ⚙️ **Project settings**.
2. انزل إلى **"Your apps"** واضغط أيقونة الويب `</>`.
3. أعطِ التطبيق اسمًا (مثلاً `menassa-web`) واضغط **Register app** (لا حاجة لـ Firebase Hosting).
4. سينسخ لك Firebase كائن `firebaseConfig` يشبه:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "menassa-alarab.firebaseapp.com",
     projectId: "menassa-alarab",
     storageBucket: "menassa-alarab.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
5. افتح ملف **`js/firebase-config.js`** في المشروع، واستبدل القيم الوهمية بقيمك الحقيقية بالضبط بنفس الأسماء.

> ملاحظة أمان: نشر `apiKey` هذا داخل كود الواجهة أمر طبيعي وآمن لتطبيقات الويب —
> الحماية الحقيقية للبيانات تأتي من **Firestore Rules** في الخطوة التالية، وليس من إخفاء هذا المفتاح.

## 3) تفعيل قواعد الحماية (Firestore Rules)

1. من **Firestore Database → Rules**.
2. افتح ملف `firestore.rules` المرفق في هذا المشروع، انسخ محتواه بالكامل.
3. الصقه في محرر القواعد بالكونسول، واضغط **Publish**.

هذه القواعد تضمن:
- أي زائر يقرأ المشاريع والعروض، لكن الكتابة تتطلب تسجيل دخول.
- المستخدم المحظور (`banned: true`) لا يستطيع نشر مشروع أو تقديم عرض.
- فقط صاحب المشروع يقبل/يرفض العروض، وفقط الأدمن (`isAdmin: true`) يعدّل حالة الحظر أو العمولة.
- مجموعة `transactions` محجوزة للمستقبل (بوابة الدفع) ومقفلة بالكامل حاليًا.

## 4) رفع المشروع على GitHub Pages

1. أنشئ مستودع جديد فارغ على GitHub (مثلاً `menassa-alarab`).
2. ارفع **كل الملفات والمجلدات** كما هي (بنفس الأسماء والمسارات: `index.html`, `css/`, `js/`, إلخ) في جذر المستودع.
3. من إعدادات المستودع: **Settings → Pages**.
4. تحت **Build and deployment**، اختر **Source: Deploy from a branch**، والفرع `main` والمجلد `/ (root)`، ثم **Save**.
5. بعد دقيقة أو اثنتين سيظهر رابط موقعك بصيغة:
   `https://username.github.io/menassa-alarab/`

> تنبيه: الموقع يعمل بـ **ES Modules**، وهذه لا تعمل عند فتح `index.html` مباشرة من جهازك (`file://`).
> إما ارفعه على GitHub Pages مباشرة، أو جرّبه محليًا عبر أي خادم بسيط مثل إضافة **Live Server** في VS Code.

## 5) إنشاء أول حساب أدمن

النظام لا يسمح لأي مستخدم بترقية نفسه لأدمن (هذا مقصود لأسباب أمنية). لإنشاء أول حساب أدمن:

1. افتح موقعك وسجّل حسابًا عاديًا من صفحة "حساب جديد".
2. اذهب إلى **Firestore Database → Data** في كونسول Firebase.
3. افتح مجموعة `users`، وابحث عن المستند الذي يحمل نفس بريدك الإلكتروني.
4. عدّل الحقل `isAdmin` من `false` إلى `true` يدويًا واحفظ.
5. أعد تحميل الموقع بعد تسجيل الدخول — سيظهر لك تبويب "لوحة تحكم الأدمن".

## 6) عن فهارس Firestore (Composite Indexes)

بعض الاستعلامات في الموقع (تصفح المشاريع حسب الحالة، وحد الـ 3 عروض اليومية لكل
مستقل) تحتاج **فهرسًا مركّبًا** ينشئه Firebase تلقائيًا. أول مرة تجرّب فيها هذه
الميزات، افتح **Console (F12) في المتصفح**: إذا ظهر خطأ من Firestore يحتوي
رابطًا (`https://console.firebase.google.com/.../indexes?create_composite=...`)،
اضغط الرابط مباشرة، وسيُنشئ لك Firebase الفهرس المطلوب تلقائيًا خلال دقيقة أو اثنتين.

## هيكل قاعدة البيانات (Firestore)

```
users/{uid}
  name, email, isAdmin, banned, walletBalance, createdAt

projects/{projectId}
  title, desc, budget, duration, category,
  ownerId, ownerName, status ('open' | 'ongoing' | 'completed'),
  acceptedBidId, progress (0-100),
  commissionPaid, commissionFlagged, createdAt

projects/{projectId}/bids/{bidId}
  freelancerId, freelancerName, amount, days, details,
  accepted, status ('pending' | 'accepted' | 'rejected'), createdAt

projects/{projectId}/chat/{msgId}
  from, fromName, text, wallet (bool), createdAt

transactions/{txId}   ← محجوزة لمستقبل بوابة الدفع (غير مُفعّلة الآن)
```

## المميزات المطبَّقة الآن

- تسجيل حقيقي (Email/Password) وربط كل مستخدم بمستنده في Firestore.
- تصفح المشاريع بحالاتها الثلاث + فلترة حسب القسم.
- نشر مشروع جديد (محظور على الحسابات المحظورة).
- تقديم عروض بحد **3 عروض يوميًا لكل مستقل** (بدون نظام نقاط) — يُحتسب تلقائيًا من قاعدة البيانات.
- قبول/رفض العروض من لوحة تفاعلية لصاحب المشروع.
- تتبع **نسبة إنجاز** كل مشروع (0-100%) يحدّثها صاحب المشروع أو المستقل المنفَّذ.
- دردشة داخلية لكل مشروع، مع زر مخصّص لإرسال رقم محفظة إلكترونية.
- لوحة تحكم أدمن: كل المستخدمين، عدد مشاريعهم وعروضهم، حظر/فك حظر، ومتابعة عمولة 5% لكل مشروع مكتمل.

## الجاهزية لربط بوابة دفع مستقبلًا

- كل مستخدم لديه بالفعل حقل `walletBalance` في مستنده.
- مجموعة `transactions` محجوزة في قاعدة البيانات وقواعد الحماية (مقفلة تمامًا الآن، مُعدّة لتُفتح لاحقًا عبر **Cloud Functions** فقط — لا يُسمح بالكتابة المباشرة من المتصفح على الأرصدة لأسباب أمنية).
- زر "طلب سحب الأرباح" ظاهر في واجهة المشروع (معطّل حاليًا بعلامة "قريبًا") تمهيدًا لتفعيله لاحقًا دون الحاجة لإعادة تصميم الواجهة.
- عند انضمام الشريك التقني لبوابة الدفع، الخطوة المطلوبة هي: إنشاء Cloud Function تستمع لتأكيد الدفع من البوابة → تحدّث `commissionPaid` و`walletBalance` و`transactions` تلقائيًا بدل التحديث اليدوي الحالي من لوحة الأدمن.
