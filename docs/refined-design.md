# Rafine görsel dil — 30 Eylül 2026

Onaylanan yön: kırık beyaz, petrol ve şampanya; mat taş, cam ve metalden bulmaca heykeli. Mevcut Bildim logosu korunur. Logo ekran genişliğine göre 168–225 px genişlikte gösterilir.

## Uygulama

- Ana sayfadaki eski SVG çizimi yerine transparan, responsive WebP görsel kullanılır. Metin ve bağlantılar HTML olarak kalır.
- Ana sayfa açıldığında 3,2 saniyelik tek ışık geçişi olur. Hareket azaltma tercihinde çalışmaz. Oyun tahtalarında ışık animasyonu yoktur.
- Varsayılan arayüz petrol renkli butonlar, açık kâğıt yüzeyler, ince kenarlar ve yumuşak gölgeler kullanır.
- Temalar mevcut fotoğraflarını, satın alma/deneme akışlarını ve tahta renklerini korur. Ortak kart, panel, menü, buton ve ana sayfa görsel dili temalara da uygulanır.
- Sekiz tema/arka planın okunurluğu ve işaretli/boş hücre ayrımı test edilir. WebKit ve Chromium ekran testleri gerçek fiziksel cihaz testi değildir.

## Görsel kaynağı

OpenAI yerleşik Imagegen aracı ile kullanıcının onayladığı taslaktan üretildi. Kaynak görseldeki yazılar veya yeniden çizilmiş logo siteye taşınmadı.

Dosyalar:
- `frontend/public/art/bildim-sculpture-768.webp` (~75 KB)
- `frontend/public/art/bildim-sculpture-1440.webp` (~231 KB)

PNG alfa kanalı korunarak WebP formatına dönüştürüldü. Görselin boyutları önceden belirtilir ve küçük ekranda küçük dosya seçilir.

Üretimde kullanılan prompt:

> Extract and faithfully reproduce ONLY the sculptural installation on the right side of the reference website mockup as a premium transparent-background website asset. Preserve the same camera angle, arrangement, deep petrol stone cuboid puzzle blocks, champagne brushed brass block, frosted glass stepped pentomino shapes, thin elegant engraved gridlines, warm ivory stone plinth and separate angular petrol stone piece leaning on the right. This is the approved composition: match it closely, same sophisticated realistic physical materials and restrained warm studio illumination, not cartoon. Remove ALL website text, logo, buttons, lines, cards, white page background, and bottom game illustrations. Frame the complete sculpture and full plinth including the right leaning piece with comfortable 5 percent transparent margin. The sculpture should occupy most of this asset, landscape 3:2 approximate. Real transparent alpha background, no fake checkerboard, no text, no typography. Keep a soft short contact shadow beneath plinth, no giant backdrop or floor plane, no new objects. Preserve glass appearance with realistic milky translucence; no white rectangular background.
