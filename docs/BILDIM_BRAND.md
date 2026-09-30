# Bildim marka uygulaması

Kullanıcıya görünen ad **Bildim**, logodaki yazım **bildim!** şeklindedir.
Ünlem web adresinin parçası değildir. GitHub deposu `Duhterakturk/bildim`,
yerel proje klasörü `Bildim` olarak yeniden adlandırılmıştır. Render servisleri
`bildim-app` ve `bildim-api`, API çalışma alanı `Bildim`, Blueprint adı `bildim`
olarak güncellenmiştir. Ücretsiz yeni statik site `bildim` olarak açılmıştır.
Güncel paylaşım adresi **https://bildim.onrender.com** adresidir.
Eski `https://mindarena-app.onrender.com` bağlantısı yeni adrese yönlendirilir.
API `https://mindarena-api.onrender.com/api` adresinde aynı veritabanıyla çalışır.
CORS iki site adresine izin verir; `PUBLIC_APP_URL` yeni Bildim adresidir.
Yeni alan adında kullanıcıların yeniden giriş yapması gerekir.
Veritabanı, oturum saklama
anahtarları ve Android paket kimliği korunmuştur.

## Görseller

- `frontend/public/brand/bildim-logo-light.png`: Kullanıcının onayladığı
  sarı-turuncu beyinli logonun şeffaf, koyu yazılı menü uyarlaması.
  Yerleşik görsel üretim aracıyla referans görselden hazırlanmıştır.
- `frontend/public/brand/bildim-icon.svg`: Küçük boyut için sadeleştirilmiş,
  düzenlenebilir beyin simgesi. PNG uygulama simgelerinin kaynağıdır.
- `frontend/public/icons/bildim-*.png`: 192 ve 512 piksel uygulama simgeleri.
  Maskelenebilir sürümde işaret güvenli merkez alanında tutulur.

Menüdeki logo alanı 150 × 44 CSS pikseldir. Görselin şeffaf dış boşluğu CSS
ile kırpılır; yazı veya beyin ayrı ayrı büyütülmez. Mevcut bütün temaların
menüsü açık zeminlidir; koyu yazılı logo bu yüzey için hazırlanmıştır.

`BrandLogo` tüm sayfalardaki ortak menüde kullanılır. Beyin ve ünlem özgün
resimden korunur; bildim yazısı gerçek HTML metnidir. Yerel Nunito 900 fontu
ve OFL lisansı `frontend/public/fonts/` içindedir. Logo alanı 150 × 44 kalır.
Açık menüde siyah (#000), cihazın koyu görünümünde koyu menü üzerinde beyaz
(#fff) kullanılır. Resim filtresi, SVG maske ve blend-mode kaldırılmıştır.
Yazı tarayıcının otomatik metin rengi dönüşümüne katılır. Chromium, Firefox,
WebKit telefon/tablet boyutlarında açık-koyu sistem geçişleri test edilmiştir.
Fiziksel Samsung cihazındaki özel koyu mod ayrıca doğrulanmalıdır.

## Görsel üretim metni

Use case: precise-object-edit. Prepare this EXACT approved logo as a transparent
website navigation asset for light backgrounds. Preserve the illustrated
yellow-to-orange brain, its dark curved folds, the four orange/yellow short rays,
the precise lowercase rounded "bildim!" lettering and orange exclamation. Do not
redesign, do not change the relative size of text to brain. Remove the black
background completely to genuine transparent alpha; change only the white word
"bildim" to solid deep charcoal #20232a so it is readable on a light header. Keep
the brain internal lines dark charcoal. Crop excess exterior empty canvas to
modest 5% margins around the horizontal logo. Smooth clean edges. No shadow,
no black box, no added text. One faithful horizontal logo, no presentation sheet.

## Yayın sınırları

Bu değişiklik web uygulamasının adını ve PWA simgelerini günceller. Daha önce
üretilen APK/AAB dosyaları yeniden derlenmemiştir; özel Android uygulamasının
içindeki ad ve simgenin değişmesi ayrıca bir Android derlemesi gerektirir.
Yerel ZIP ve APK/AAB dosya adları Bildim olarak düzenlenmiştir. ZIP içindeki
uygulama dosyalarının adları da güncellenmiş, ikili içerikler SHA-256 ile
aynı oldukları doğrulanarak korunmuştur. İmzalama anahtarları ve mevcut
kullanıcı kayıtları değiştirilmez.

Eski tarihli denetim raporları tarihsel kayıt olarak eski adı taşıyabilir.

`render.yaml` içindeki eski kaynak adları mevcut dağıtımın tarihsel
eşlemesidir; bu dosya marka değişikliği sırasında yeniden eşitlenmemiştir.
API ve ön yüz ayrı çalışma alanlarındadır. Yeni bir Blueprint kurulumu veya
adres geçişi yapılacaksa mevcut servis eşlemesi ve ortam değişkenleri önce
kontrol edilmelidir; yalnız metin değiştirerek yeni servis oluşturulmamalıdır.

## Doğrulama

Zemine uyarlanan logo güncellemesinde sekiz tema, geçici tema denemeleri,
açık/koyu zemin geçişi ve yerel menü zemini için 24 masaüstü/mobil tarayıcı
testi ve üretim derlemesi geçti. Mevcut temaların hepsi açık menü kullanır;
beyaz yazılı davranış ayrıca yapay koyu menü zeminiyle doğrulandı.

- Üretim derlemesi başarılı.
- Hesap, giriş, metin taşması ve sekiz tema için 46 masaüstü/mobil tarayıcı
  testi başarılı. Bu testler API yanıtlarını taklit eder; canlı hesap denetimi değildir.
- 1440, 390 ve 320 pikselde sekme adı, logo yüklenmesi, 150 × 44 boyut sınırı,
  yatay taşma, ana sayfa bağlantısı ve manifest simgeleri kontrol edildi.
  Masaüstü, mobil ve oyun ekranı görüntüleri görsel olarak incelendi.
- İlerleme raporu, sertifika ve kimlik doğrulama için 20 backend testi başarılı.
  İlk denemede bağımlılık içe aktarım hatası oluştu; tekrarında geçildi.
- Genel frontend testlerinde önce 77/81 geçti. Aynı anda çalışan testlerde
  üç üretim süresi sınırı ve Çit üretim hatası görüldü. Etkilenen dört dosya
  tek işçiyle tekrar çalıştırıldığında 11/11 geçti; bunlar ilk başarısız olan
  dört testi de kapsar. Çit testi 300 zor bulmacanın tek çözümünü kontrol etti.
  Oyun üreticileri ve test eşikleri bu marka değişikliğinde değiştirilmedi.

## Ana sayfa — 30 Eylül 2026

Onaylanan “Bir bulmacayla başlayalım.” başlığıyla ana sayfa yenilendi.
Krem yüzey, yeşil eylem düğmesi, kayısı renkli pentomino illüstrasyonu ve
üç oyun önizlemesi tek bir kompozisyonda kullanılır. Önizlemeler oynanabilir
tahta değildir; kartlar ilgili oyuna yönlendirir. Logo bileşeni değiştirilmedi.
Tema seçimi ana yüzey ve metin renklerini etkilemeye devam eder.
Sınıf daveti ziyaretçilere ve öğretmenlere gösterilir; öğretmeni doğrudan
Hesabım içindeki Sınıflar bölümüne götürür. Öğrenci ve bireysel hesaplarda gizlidir.

Doğrulama: ana sayfa, tema, dil ve logo kapsamındaki 36 tarayıcı senaryosu
sonuçta başarılıdır. İlk koşudaki altı hata mobilde kapalı menüden oturum
kontrolü yapan yeni testten kaynaklandı; görünür yıldız bakiyesine göre
bekleme düzeltilerek ilgili sekiz senaryo yeniden geçti. Chromium, Firefox
ve WebKit kullanıldı; 320, 820 ve 1440 piksel düzenleri, sekiz tema,
rol bağlantıları, Türkçe varsayılan ve İngilizce tercih kontrol edildi.
Bu testler API yanıtlarını taklit eder ve fiziksel Samsung/iPhone testi değildir.
Masaüstü ve telefon ekran görüntüleri ayrıca görsel olarak incelendi.
Üretim derlemesi geçti. PWA önbellek sürümü bildim-v13 oldu.

### Tema denemesi düzeltmesi

Ana sayfa artık 60 saniyelik tema denemesini iptal etmez. Denenen tema,
önceden kullanılan arka planın üzerinde öncelik alır; vazgeçilince kayıtlı
seçime dönülür. Ana sayfadaki bulmaca görsel alanı seçilen fotoğrafı gösterir;
yazılar opak yüzeylerle korunur. Kullanın işlemi başarılı olduğunda geçici
deneme biter ve kayıtlı seçim hemen uygulanır.

14 masaüstü/mobil tarayıcı testi geçti: sekiz tema/arka plan görünümü,
oyun tahtası okunurluğu, ana sayfada deneme, iptal, kayıtlı arka planla
çakışma ve kullanımdan sonra sayfa yenileme. API yanıtları taklit edildi.
Orman temasının masaüstü ve telefon ekran görüntüleri incelendi.
Üretim derlemesi başarılı; önbellek sürümü bildim-v14.

### Kalıcı tema seçimi ve referans kompozisyonu
Tema satın almak/uygulamak ayrı arka planı devreden çıkarır. Daha sonra
özellikle bir arka plan seçmek mümkündür. Arka plan tarafından örtülmüş
aktif temaya yeniden basmak temayı kapatmak yerine kendi fotoğrafını geri
getirir; dükkân bu durumda Kullanın gösterir. Ürün sahipliği ve bakiye korunur.
Ana bölüm tam genişlikte tek fotoğraf geçişi, büyük tahta ve yatay oyun
kartlarıyla onaylı kompozisyona yaklaştırıldı. Logo değiştirilmedi.
9 backend dükkân testi geçti. Tema/ana sayfa tarayıcı senaryoları geçti;
320 px'teki 4 px taşma giderildikten sonra beş tarayıcı/ekran projesindeki
responsive test tekrar geçti. Eski Mürekkep + Orman durumu için iki yeni
arayüz testi geçti. Üretim derlemesi başarılı. Testler izole veriler kullanır.
