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
    title: "Terms of Service",
    lastUpdated: "Last updated: May 10, 2026",
    intro: "These Terms of Service govern your use of Birik (\"Service\"), operated by Sercan Furunci (\"we\", \"us\"). By creating an account you agree to these terms.",
    sections: [
      {
        h: "1. Eligibility",
        body: [
          "You must be at least 13 years old to use Birik. By registering, you confirm that you meet this requirement.",
        ],
      },
      {
        h: "2. Your Account",
        body: [
          "You are responsible for keeping your password secure and for all activity that occurs under your account.",
          "You must provide accurate information when registering. Do not impersonate others or create accounts on their behalf without permission.",
          "Notify us immediately if you suspect unauthorized access to your account.",
        ],
      },
      {
        h: "3. Acceptable Use",
        body: [
          "You may use Birik only for lawful personal finance tracking. You agree not to:",
          "• Attempt to reverse-engineer, hack, or disrupt the Service or its infrastructure.",
          "• Upload malicious files, scripts, or content designed to harm other users or our systems.",
          "• Use the Service to store or process financial data of third parties without their consent.",
          "• Circumvent rate limits, authentication, or any other security measure.",
        ],
      },
      {
        h: "4. Data You Enter",
        body: [
          "You retain ownership of all financial data you enter into Birik. We do not claim any rights over your transactions, budgets, or goals.",
          "You grant us a limited license to store and process your data solely to provide the Service to you.",
        ],
      },
      {
        h: "5. AI Statement Import",
        body: [
          "The AI Statement Import feature sends your uploaded bank statements to Anthropic's Claude API for one-time extraction. Extracted data is returned to you and stored in your account. Raw files are not retained on our servers.",
          "Review extracted transactions before saving — AI extraction may occasionally misread amounts or categories.",
        ],
      },
      {
        h: "6. Subscription Reminders & Emails",
        body: [
          "By registering, you consent to receiving transactional emails from Birik, including account verification, password reset, and optional subscription bill reminders you configure.",
          "You can disable bill reminder emails at any time by removing the reminder setting from each subscription inside the app.",
        ],
      },
      {
        h: "7. Service Availability",
        body: [
          "We aim to keep Birik available at all times but do not guarantee uninterrupted access. We may perform maintenance, apply updates, or temporarily suspend the Service without prior notice.",
        ],
      },
      {
        h: "8. Disclaimer of Warranties",
        body: [
          "Birik is provided \"as is\" without warranties of any kind. We are not financial advisors. Nothing in the Service constitutes financial, tax, or investment advice.",
          "We are not liable for decisions you make based on data displayed in the app.",
        ],
      },
      {
        h: "9. Limitation of Liability",
        body: [
          "To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including data loss.",
        ],
      },
      {
        h: "10. Termination",
        body: [
          "You may delete your account at any time from Profile → Danger Zone → Delete Account. All your data will be permanently removed.",
          "We reserve the right to suspend or terminate accounts that violate these terms.",
        ],
      },
      {
        h: "11. Changes to These Terms",
        body: [
          "We may update these terms. The \"Last updated\" date at the top reflects the latest revision. Continued use of the Service after changes constitutes acceptance of the new terms.",
        ],
      },
      {
        h: "12. Contact",
        body: [
          "Questions about these terms: support@furunci.tech",
        ],
      },
    ],
    back: "Back",
  },
  tr: {
    title: "Kullanım Koşulları",
    lastUpdated: "Son güncelleme: 10 Mayıs 2026",
    intro: "Bu Kullanım Koşulları, Sercan Furunci (\"biz\", \"bizim\") tarafından işletilen Birik'yu (\"Hizmet\") kullanımınızı düzenler. Hesap oluşturarak bu koşulları kabul etmiş sayılırsınız.",
    sections: [
      {
        h: "1. Uygunluk",
        body: [
          "Birik'yu kullanabilmek için en az 13 yaşında olmanız gerekir. Kayıt olarak bu şartı karşıladığınızı onaylamış olursunuz.",
        ],
      },
      {
        h: "2. Hesabınız",
        body: [
          "Şifrenizi güvende tutmaktan ve hesabınızda gerçekleşen tüm etkinlikten siz sorumlusunuz.",
          "Kayıt olurken doğru bilgi vermeniz zorunludur. Başkalarının kimliğine bürünmeyin veya izinleri olmadan adlarına hesap oluşturmayın.",
          "Hesabınıza yetkisiz erişim şüphesi duyarsanız bizi hemen bilgilendirin.",
        ],
      },
      {
        h: "3. Kabul Edilebilir Kullanım",
        body: [
          "Birik'yu yalnızca yasal kişisel finans takibi için kullanabilirsiniz. Aşağıdakileri yapmamayı kabul edersiniz:",
          "• Hizmeti veya altyapısını tersine mühendislik, hackleme veya kesintiye uğratma girişiminde bulunmak.",
          "• Diğer kullanıcılara veya sistemlerimize zarar vermek amacıyla kötü amaçlı dosya, komut dosyası veya içerik yüklemek.",
          "• Üçüncü kişilerin finansal verilerini rızaları olmadan işlemek için Hizmeti kullanmak.",
          "• İstek sınırlarını, kimlik doğrulamayı veya diğer güvenlik önlemlerini aşmaya çalışmak.",
        ],
      },
      {
        h: "4. Girdiğiniz Veriler",
        body: [
          "Birik'ya girdiğiniz tüm finansal verilerin mülkiyeti size aittir. İşlemleriniz, bütçeleriniz veya hedefleriniz üzerinde herhangi bir hak talep etmiyoruz.",
          "Size Hizmeti sunmak amacıyla verilerinizi depolamak ve işlemek için bize sınırlı bir lisans vermiş olursunuz.",
        ],
      },
      {
        h: "5. AI Ekstre İçe Aktarma",
        body: [
          "AI Ekstre İçe Aktarma özelliği, yüklediğiniz banka ekstrelerini tek seferlik çıkarım için Anthropic'in Claude API'sine gönderir. Çıkarılan veriler size döndürülür ve hesabınızda saklanır. Ham dosyalar sunucularımızda tutulmaz.",
          "Kaydetmeden önce çıkarılan işlemleri gözden geçirin; AI çıkarımı zaman zaman tutarları veya kategorileri yanlış okuyabilir.",
        ],
      },
      {
        h: "6. Abonelik Hatırlatıcıları ve E-postalar",
        body: [
          "Kayıt olarak Birik'dan işlem e-postaları almayı kabul etmiş olursunuz; bunlar arasında hesap doğrulama, şifre sıfırlama ve uygulama içinde yapılandırdığınız isteğe bağlı abonelik fatura hatırlatıcıları yer alır.",
          "Fatura hatırlatıcısı e-postalarını, uygulama içinden ilgili aboneliğin hatırlatıcı ayarını kaldırarak istediğiniz zaman devre dışı bırakabilirsiniz.",
        ],
      },
      {
        h: "7. Hizmet Erişilebilirliği",
        body: [
          "Birik'yu her zaman erişilebilir tutmayı hedefliyoruz ancak kesintisiz erişimi garanti etmiyoruz. Önceden bildirimde bulunmaksızın bakım yapabilir, güncellemeler uygulayabilir veya Hizmeti geçici olarak askıya alabiliriz.",
        ],
      },
      {
        h: "8. Garanti Reddi",
        body: [
          "Birik, herhangi bir garanti olmaksızın \"olduğu gibi\" sunulmaktadır. Finansal danışman değiliz. Hizmet içindeki hiçbir şey finansal, vergi veya yatırım tavsiyesi niteliği taşımaz.",
          "Uygulamada gösterilen verilere dayanarak verdiğiniz kararlardan sorumlu değiliz.",
        ],
      },
      {
        h: "9. Sorumluluk Sınırlaması",
        body: [
          "Yasaların izin verdiği azami ölçüde, veri kaybı dahil olmak üzere Hizmeti kullanımınızdan kaynaklanan dolaylı, arızi veya sonuçsal zararlardan sorumlu değiliz.",
        ],
      },
      {
        h: "10. Hesap Sonlandırma",
        body: [
          "Hesabınızı istediğiniz zaman Profil → Tehlikeli Bölge → Hesabı Sil yolundan silebilirsiniz. Tüm verileriniz kalıcı olarak kaldırılacaktır.",
          "Bu koşulları ihlal eden hesapları askıya alma veya sonlandırma hakkımızı saklı tutarız.",
        ],
      },
      {
        h: "11. Koşullardaki Değişiklikler",
        body: [
          "Bu koşulları güncelleyebiliriz. Üstteki \"Son güncelleme\" tarihi en son revizyonu gösterir. Değişikliklerden sonra Hizmeti kullanmaya devam etmek yeni koşulları kabul ettiğiniz anlamına gelir.",
        ],
      },
      {
        h: "12. İletişim",
        body: [
          "Bu koşullara ilişkin sorularınız için: support@furunci.tech",
        ],
      },
    ],
    back: "Geri",
  },
};

function TermsPage({ isDark, toggleDark, onBack }) {
  const { lang, toggleLang } = useLang();
  const c = CONTENT[lang] || CONTENT.en;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
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

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 anim-1">
        <div className="flex items-center gap-3 mb-3">
          <svg className="birik-logo shrink-0" width="40" height="40" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 11 }}>
            <rect width="128" height="128" rx="28" fill="#0D0D0D"/>
            <path d="M30 28 H70 Q90 28 90 46 Q90 64 70 64 H30 Z" fill="#10B981"/>
            <path d="M30 64 H74 Q96 64 96 82 Q96 100 74 100 H30 Z" fill="#10B981"/>
            <circle cx="40" cy="22" r="3.5" fill="#10B981"/>
            <circle cx="60" cy="22" r="3.5" fill="#10B981"/>
            <circle cx="80" cy="22" r="3.5" fill="#10B981"/>
          </svg>
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

export default TermsPage;
