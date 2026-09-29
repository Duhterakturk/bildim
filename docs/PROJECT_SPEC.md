# Bildim – Teknik Proje Dokümantasyonu

## Genel Tanım
- **Proje Adı:** Bildim
- **Amaç:** 2. sınıf seviyesinden başlayarak ileri düzeye kadar akıl oyunları sunan, TaZOf sınavına hazırlık için profesyonel bir web platformu geliştirmek.

## İçerik Modülleri
1. Kakuro
2. Sudoku
3. Bölgesel Sudoku
4. Apartman
5. Çit
6. Amiral Battı
7. Sihirli Piramit
8. Patika
9. ABC Bağlama
10. İşlem Karesi
11. Kendoku
12. Yıldız Savaşları
13. Kare Karalamaca
14. Çarpmaca
15. Futoshiki
16. Pentominolar
17. Metaforms
18. Numbers
19. Colours

## Teknoloji Yığını
- **Frontend:** React (component bazlı, responsive tasarım, Tailwind CSS)
- **Backend:** Flask (Python) + REST API
- **Veritabanı:** PostgreSQL (oyun skorları, kullanıcı profilleri, ilerleme takibi)
- **Tasarım:** Modern, çocuk dostu ama profesyonel arayüz
- **Kullanıcı Yönetimi:** Öğrenci / Veli / Öğretmen rolleri
- **İlerleme Takibi:** Oyun bazlı başarı puanları, raporlama, grafikler

## Fonksiyonel Özellikler
- Kullanıcı kayıt ve giriş sistemi (JWT)
- Oyun motoru modüler yapıda (her oyun ayrı component + backend endpoint)
- Skor tablosu ve başarı rozetleri
- İlerleme raporları (PDF/Excel export opsiyonu)
- Çoklu dil desteği (Türkçe / İngilizce)
- Mobil uyumlu tasarım

## Notlar (Uygulama İskeleti)
Bu depoda oluşturulan iskelet, yukarıdaki gereksinimlerin ilk teknik temelini oluşturur:
- `backend/` — Flask uygulama fabrikası, JWT tabanlı auth, roller (student/parent/teacher), Game/Score modelleri, REST endpoint'leri.
- `frontend/` — Vite + React + Tailwind, react-router, react-i18next (TR/EN), modüler oyun kayıt sistemi (`src/games/registry.js`) ve örnek olarak uçtan uca çalışan Sudoku modülü.
- Diğer 17 oyun, aynı modüler yapıya (`games/<oyun-adı>/`) eklenerek genişletilecek şekilde tasarlanmıştır.
