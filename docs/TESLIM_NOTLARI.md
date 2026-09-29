# Teslim notları — 29 Eylül 2026

Uygulama kodu referansı: a1884f3. Hesap türleri: öğretmen, öğrenci, bireysel. Üst menü: Oyunlar, Dükkân, Hesabım.

## Doğrulama

- 81 frontend birim testi ve 114 backend testi geçti.
- Tarayıcı toplu koşusunda 115 geçti, 5 başarısız, 10 atlandı. Eski metin beklentileri ve görünür alan dışında sürükleme yapan test düzeltildi; ilgili yeniden koşularda kalan başarısızlıklar giderildi. Böylece 120 farklı tarayıcı senaryosu doğrulandı. Bu, tek koşuda alınmış 120/120 sonucu değildir.
- Son uygulama derlemesi başarılı.
- Canlı web adresi HTTP 200; API sağlık yanıtı ok. Canlı kayıtta üç hesap türü görüldü. Misafir Sudoku açıldı; Temizle → Vazgeç işleminde hücre değeri korundu.
- Canlıda öğretmen/öğrenci hesapları oluşturularak uçtan uca sınıf testi yapılmadı. Yerel backend testleri SQLite kullanır; canlı PostgreSQL migration durumunu tek başına kanıtlamaz.
- Bu kontroller 100 eşzamanlı kullanıcı yük testi değildir.

## Paketler

- Öğretmen teslim ZIP’i yalnız bağlantı, kullanım rehberi ve paylaşım metni içerir. Hesap, şifre, kaynak kodu veya Android imzalama anahtarı içermez.
- Kaynak kodu ZIP’i Git’teki teslim commitinden alınır; yerel .env, veritabanı, test çıktıları, bağımlılıklar ve imzalama dosyaları dahil edilmez. .env.example geliştirme şablonudur.
- Google Play ZIP’i sahibine özel geliştirme paketidir. APK/AAB ve imzalama anahtarı içerir; öğretmene gönderilmez.
- Mevcut APK/AAB bu teslimde yeniden derlenmedi veya cihazda doğrulanmadı. Eklenen güncel belgeler Android ikililerinin yeni sürüm olduğu anlamına gelmez.
- Kaynak arşivi veritabanı yedeği değildir. Canlı kullanıcı verilerinin yedeklenmesi ayrı yönetilir; docs/YEDEK.md içindeki otomasyonun gerçek çalıştırma durumu bu teslimde doğrulanmadı.
