# Kitapçık uyarlaması — 30 Eylül 2026

Kaynak: Kullanıcının sağladığı 41 sayfalık Örnek Kitapçık.pdf. Kurallar ve örnekler görsel olarak incelendi. Kitapçığın sayfaları veya hazır soruları uygulamaya kopyalanmadı; mevcut üreticilerden yeni sorular oluşturuluyor.

| Oyun | İnceleme / değişiklik |
|---|---|
| Sudoku | Satır, sütun ve bölge kuralları korundu. |
| Bölgesel Sudoku | Düzensiz bölge kuralları korundu; uygulamanın boyutları korundu. |
| Kendoku | İşlem ve sayı kullanım açıklaması netleştirildi. |
| Apartman | Görünür bina ve Latin kare kuralları korundu. |
| Çit | Tek kapalı çevrim korundu; köşedeki 2 hakkında hatalı ipucu kaldırıldı. |
| Kakuro | Tekrarsız 1–9 toplamları korundu. |
| İşlem Karesi | Kolay seviye de 3×3 ve 1–9 olacak şekilde değiştirildi. |
| ABC Bağlama | Bütün hücreleri kapsayan, kesişmeyen bağlantılar korundu. |
| Sihirli Piramit | Her sıradan bir sayı ve komşu alt hücre yolu korundu. |
| Patika | Siyah çizimli tek çevrim korundu; tüm beyaz kareleri kapsama ipucu düzeltildi. |
| Amiral Battı | Filo, satır/sütun toplamları ve çapraz dahil temas yasağı korundu. |
| Yıldız Savaşları | Satır/sütun/bölge başına yıldız ve temas yasağı korundu. |
| Kare Karalamaca | Grup sırası ve aradaki boşluk açıklaması netleştirildi. |
| Çarpmaca | Çarpım tablosu yerine satır ve sütun başına tam iki sayı ve kenar çarpımları getirildi. |
| Futoshiki | Latin kare ve eşitsizlikler korundu. |
| Pentominolar | Parçalarla tam örtme, döndürme ve yansıtma korundu. |
| Metaforms | Yerleşim, desen ve çarpılı kare kısıtları korundu. |
| Numbers | Yerleşim, sayı kümesi ve dışlama ipuçları eklendi; mevcut toplam/ilişki ipuçları korundu. |
| Colours | Yeni bulmacalar dokuz farklı renkli daire kullanıyor. Eski bulmacalarla uyumluluk korundu. |

## Turnuva modu

Oyunlar ekranından ayrı seçilir. 19 oyun için bulmacanın çözümünden işaretli hücre toplamı, parça/harf, dönüş veya kenar sayısı gibi çoktan seçmeli sorular üretilir. Küçük konum şeması oyun tahtasındaki ilgili kareleri gösterir. Doğru seçenek sunucuda tutulur. Her soruda bir cevap gönderilir; sonuç ve doğru seçenek gösterilir. Normal oyun yıldızları, skor kaydı ve ipucu kazanımı bu modda kullanılmaz.

Bu sürüm soru pratiğidir: sınıflar arası sıralama, öğretmenin sınav oluşturması veya süreli yarışma eklenmedi. Kitapçıkta bahsedilen tüm alternatif tahta boyutları (örneğin Numbers 4×4) eklenmedi.

## Kontroller

- Değişen dört üretici: her zorlukta 30, toplam 360 bulmaca; doğru çözümler backend tarafından kabul edildi, değiştirilmiş cevaplar reddedildi.
- 19 oyunda gerçek üreticiyle turnuva sorusu ve geçerli işaret konumları kontrol edildi.
- Backend puanlama ve turnuva testleri: 30 geçti.
- Değişen üreticiler ve dil dosyaları için hedefli birim testleri: 9 geçti.
- Masaüstü ve mobil tarayıcı akışı: 6 geçti; ekran görüntüleri incelendi.
- Üretim derlemesi ve git diff boşluk kontrolü geçti.

Bu çalışma tüm 19 oyun için yeniden bağımsız çözücü yazılan kapsamlı bir tek-çözüm denetimi veya yük testi değildir.


## Apartman correction
All levels now start with an empty 4x4 grid. Easy/medium/hard retain 12/9/6 exterior clues respectively, with uniqueness checked after each removal. This supersedes the earlier Apartman review, which missed prefilled cells. Independent enumeration of all 576 Latin squares verified 30 puzzles per level (90 total), correct-answer acceptance and single-cell-error rejection. Legacy issued puzzles remain gradable.
