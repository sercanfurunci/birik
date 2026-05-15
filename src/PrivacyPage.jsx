import { useLang } from "./i18n.jsx";

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

const CONTENT = {
  en: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: May 8, 2026",
    intro: "Birik (\"we\", \"us\", \"our\") respects your privacy. This policy explains what data we collect, how we use it, and your rights.",
    sections: [
      {
        h: "1. Data We Collect",
        body: [
          "Account information: email address, optional phone number, password (stored as a one-way bcrypt hash — we never see your plain password), display name, and preferred currency.",
          "Financial data you enter: transactions (amount, category, description, date, type), monthly budgets, and subscription records.",
          "Bank statements you upload: PDFs or images submitted to the AI Statement Import feature are processed in memory and discarded after extraction. We do not store the raw files.",
          "Technical data: IP address (used only for rate limiting and abuse prevention), and browser/device information sent automatically with each request.",
        ],
      },
      {
        h: "2. How We Use Your Data",
        body: [
          "To provide the service: store and display your transactions, budgets, and subscriptions; send verification and password-reset emails; process statement imports.",
          "To secure your account: rate-limit login attempts, detect abuse, and authenticate API requests with JWT tokens.",
          "We do not sell your data, share it with advertisers, or use it for marketing.",
        ],
      },
      {
        h: "3. Third-Party Services",
        body: [
          "Neon (PostgreSQL hosting): stores your account and financial data. Encrypted at rest and in transit.",
          "Railway: hosts the backend API. Receives requests but does not retain personal data beyond logs.",
          "Vercel: hosts the web frontend. Sees only static assets and client requests, no database access.",
          "Resend: sends transactional email (verification, password reset). Receives recipient email and message content.",
          "Anthropic Claude API: processes uploaded bank statements. Statement content is sent for one-time extraction; per Anthropic's policy, API inputs are not used to train models.",
          "Frankfurter (open exchange-rate API): we query daily exchange rates without sending any user data.",
          "Google Favicon API: fetches subscription brand icons by domain name. No user identity is sent.",
        ],
      },
      {
        h: "4. Data Retention",
        body: [
          "Your data is retained for as long as your account is active. When you delete your account, all transactions, budgets, and subscriptions are removed immediately and permanently.",
          "Server logs (containing IP addresses) are retained for up to 30 days for security analysis.",
        ],
      },
      {
        h: "5. Your Rights",
        body: [
          "Access: You can view all of your data within the app.",
          "Export: You can export your transactions to CSV at any time.",
          "Correction: You can edit any transaction, budget, or subscription directly in the app.",
          "Deletion: You can permanently delete your account inside the app — open Profile → Danger Zone → Delete Account. Your account, transactions, budgets, and subscriptions are removed immediately. If you prefer, you can also email us at the address below.",
          "If you are in the EU, UK, or California, you also have rights under GDPR/UK GDPR/CCPA to request a copy or erasure of your data.",
        ],
      },
      {
        h: "6. Cookies & Local Storage",
        body: [
          "We use a JWT authentication token stored in your browser (localStorage on web, secure native storage in mobile apps) to keep you signed in. We use no advertising or tracking cookies.",
          "Your dark/light mode and language preferences are also saved locally so they persist between sessions.",
        ],
      },
      {
        h: "7. Children",
        body: [
          "Birik is not intended for users under 13. We do not knowingly collect data from children. If you believe a child has registered, contact us and we will delete the account.",
        ],
      },
      {
        h: "8. Security",
        body: [
          "Passwords are stored as bcrypt hashes. All traffic between your device and our servers uses HTTPS/TLS. Database connections are encrypted. We do our best to protect your data, but no system is 100% secure.",
        ],
      },
      {
        h: "9. Changes to This Policy",
        body: [
          "We may update this policy. The \"Last updated\" date at the top reflects the latest revision. Material changes will be communicated via email or an in-app notice.",
        ],
      },
      {
        h: "10. Contact",
        body: [
          "Questions, requests, or complaints: privacy@furunci.tech",
        ],
      },
    ],
    back: "Back",
  },
  tr: {
    title: "Gizlilik Politikası",
    lastUpdated: "Son güncelleme: 8 Mayıs 2026",
    intro: "Birik (\"biz\", \"bizim\") gizliliğinize saygı duyar. Bu politika, hangi verileri topladığımızı, nasıl kullandığımızı ve haklarınızı açıklar.",
    sections: [
      {
        h: "1. Topladığımız Veriler",
        body: [
          "Hesap bilgileri: e-posta adresi, isteğe bağlı telefon numarası, şifre (tek yönlü bcrypt hash olarak saklanır — düz şifrenizi asla görmeyiz), görünen ad ve tercih edilen para birimi.",
          "Girdiğiniz finansal veriler: işlemler (tutar, kategori, açıklama, tarih, tür), aylık bütçeler ve abonelik kayıtları.",
          "Yüklediğiniz banka ekstreleri: AI Ekstre İçe Aktarma özelliğine gönderilen PDF veya görseller bellekte işlenir ve çıkarımdan sonra silinir. Ham dosyaları saklamıyoruz.",
          "Teknik veriler: IP adresi (yalnızca hız sınırlama ve kötüye kullanımı engelleme için), tarayıcı/cihaz bilgileri (her istekte otomatik gönderilir).",
        ],
      },
      {
        h: "2. Verileri Nasıl Kullanıyoruz",
        body: [
          "Hizmeti sağlamak için: işlemlerinizi, bütçelerinizi ve aboneliklerinizi saklayıp göstermek; doğrulama ve şifre sıfırlama e-postaları göndermek; ekstre içe aktarımlarını işlemek.",
          "Hesabınızı güvende tutmak için: giriş denemelerini sınırlamak, kötüye kullanımı tespit etmek ve API isteklerini JWT token'larıyla doğrulamak.",
          "Verilerinizi satmıyor, reklam verenlerle paylaşmıyor veya pazarlama için kullanmıyoruz.",
        ],
      },
      {
        h: "3. Üçüncü Taraf Hizmetleri",
        body: [
          "Neon (PostgreSQL barındırma): hesap ve finansal verilerinizi saklar. Hem bekleme hem aktarım sırasında şifrelidir.",
          "Railway: backend API'yi barındırır. İstekleri alır ancak loglar dışında kişisel veri tutmaz.",
          "Vercel: web frontend'i barındırır. Yalnızca statik dosyaları ve istemci isteklerini görür; veritabanına erişimi yoktur.",
          "Resend: işlem e-postaları gönderir (doğrulama, şifre sıfırlama). Alıcı e-postasını ve mesaj içeriğini alır.",
          "Anthropic Claude API: yüklenen banka ekstrelerini işler. Ekstre içeriği tek seferlik çıkarım için gönderilir; Anthropic'in politikasına göre API girdileri model eğitiminde kullanılmaz.",
          "Frankfurter (açık döviz kuru API'si): kullanıcı verisi göndermeden günlük döviz kurlarını sorgular.",
          "Google Favicon API: abonelik marka ikonlarını alan adına göre çeker. Kullanıcı kimliği gönderilmez.",
        ],
      },
      {
        h: "4. Veri Saklama",
        body: [
          "Verileriniz hesabınız aktif olduğu sürece saklanır. Hesabınızı sildiğinizde tüm işlemleriniz, bütçeleriniz ve abonelikleriniz anında ve kalıcı olarak kaldırılır.",
          "Sunucu logları (IP adresleri içeren) güvenlik analizi için en fazla 30 gün saklanır.",
        ],
      },
      {
        h: "5. Haklarınız",
        body: [
          "Erişim: Tüm verilerinizi uygulama içinde görüntüleyebilirsiniz.",
          "Dışa aktarma: İşlemlerinizi istediğiniz zaman CSV olarak dışa aktarabilirsiniz.",
          "Düzeltme: İşlem, bütçe veya aboneliği doğrudan uygulama içinde düzenleyebilirsiniz.",
          "Silme: Hesabınızı uygulama içinden kalıcı olarak silebilirsiniz — Profil → Tehlikeli Bölge → Hesabı Sil yolunu izleyin. Hesabınız, işlemleriniz, bütçeleriniz ve abonelikleriniz anında kaldırılır. İsterseniz aşağıdaki e-posta adresine de yazabilirsiniz.",
          "AB, Birleşik Krallık veya California'daysanız GDPR/UK GDPR/CCPA kapsamında verilerinizin bir kopyasını veya silinmesini talep etme haklarınız vardır.",
        ],
      },
      {
        h: "6. Çerezler ve Yerel Depolama",
        body: [
          "Sizi oturumda tutmak için tarayıcınızda saklanan bir JWT kimlik doğrulama token'ı kullanırız (web'de localStorage, mobil uygulamalarda güvenli native depolama). Reklam veya takip çerezi kullanmıyoruz.",
          "Karanlık/aydınlık mod ve dil tercihleriniz de oturumlar arasında korunmak üzere yerel olarak saklanır.",
        ],
      },
      {
        h: "7. Çocuklar",
        body: [
          "Birik 13 yaş altı kullanıcılar için tasarlanmamıştır. Çocuklardan bilerek veri toplamayız. Bir çocuğun kayıt olduğunu düşünüyorsanız bize ulaşın, hesabı sileriz.",
        ],
      },
      {
        h: "8. Güvenlik",
        body: [
          "Şifreler bcrypt hash olarak saklanır. Cihazınız ile sunucularımız arasındaki tüm trafik HTTPS/TLS kullanır. Veritabanı bağlantıları şifrelidir. Verilerinizi korumak için elimizden geleni yaparız ancak hiçbir sistem %100 güvenli değildir.",
        ],
      },
      {
        h: "9. Bu Politikadaki Değişiklikler",
        body: [
          "Bu politikayı güncelleyebiliriz. Üstteki \"Son güncelleme\" tarihi en son revizyonu gösterir. Önemli değişiklikler e-posta veya uygulama içi bildirim ile iletilecektir.",
        ],
      },
      {
        h: "10. İletişim",
        body: [
          "Soru, talep veya şikayetler için: privacy@furunci.tech",
        ],
      },
    ],
    back: "Geri",
  },
};

function PrivacyPage({ isDark, toggleDark, onBack }) {
  const { lang, toggleLang } = useLang();
  const c = CONTENT[lang] || CONTENT.en;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      {/* Top bar */}
      <div className="sticky top-0 z-10" style={{ backgroundColor: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-opacity hover:opacity-70"
            style={{ color: "var(--text-3)", background: "none", border: "none" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            {c.back}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={toggleLang} className="fin-icon-btn" title="Switch language">
              <span className="text-xs font-semibold">{lang === "en" ? "TR" : "EN"}</span>
            </button>
            <button onClick={toggleDark} className="fin-icon-btn" title="Toggle theme">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 anim-1">
        <div className="flex items-center gap-3 mb-3">
          <img src="/birik.svg" className="birik-logo shrink-0" width="40" height="40" alt="Birik" />
          <span className="fin-serif text-lg" style={{ color: "var(--text-2)" }}>Birik</span>
        </div>
        <h1 className="fin-serif text-3xl sm:text-4xl mb-2" style={{ color: "var(--text-1)" }}>
          {c.title}
        </h1>
        <p className="text-xs mb-8" style={{ color: "var(--text-3)" }}>{c.lastUpdated}</p>

        <p className="text-sm sm:text-base leading-relaxed mb-10" style={{ color: "var(--text-2)" }}>
          {c.intro}
        </p>

        {c.sections.map((s) => (
          <section key={s.h} className="mb-8">
            <h2 className="font-semibold text-base sm:text-lg mb-3" style={{ color: "var(--text-1)" }}>
              {s.h}
            </h2>
            <div className="space-y-2.5">
              {s.body.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}

        <div className="mt-12 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            © {new Date().getFullYear()} Birik · furunci.tech
          </p>
        </div>
      </article>
    </div>
  );
}

export default PrivacyPage;
