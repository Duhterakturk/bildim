# Bildim marka uygulaması

Kullanıcıya görünen ad **Bildim**, logodaki yazım **bildim!** şeklindedir.
Ünlem web adresinin parçası değildir. GitHub deposu `Duhterakturk/bildim`,
yerel proje klasörü `Bildim` olarak yeniden adlandırılmıştır. Render adresleri
ve API adresleri henüz eskisiyle çalışmaktadır. Veritabanı, oturum saklama
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

`BrandLogo` menünün hesaplanan gerçek zemin rengini okuyup beyaz veya koyu
yazıdan daha yüksek kontrast sağlayanı seçer. Tema değişimi, deneme ve geri
dönüş sırasında renk yeniden hesaplanır. Beyaz sürüm aynı görselin yalnız
yazı bölgesine uygulanan CSS filtresidir; beyin ve ünlem renkleri değişmez.
Yeni bir logo dosyası kullanılırsa yazıyı ayıran `clip-path` sınırları da
güncellenmelidir.

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
