# MindArena

Türkçe ve İngilizce arayüzü bulunan, 19 mantık bulmacası oyunundan oluşan React + Vite / Flask web uygulaması.

**Uygulama:** https://mindarena-app.onrender.com

- [Öğretmen için hızlı başlangıç](docs/OGRETMEN_REHBERI.md)
- [Teslim ve doğrulama notları](docs/TESLIM_NOTLARI.md)
- [Veritabanı yedekleme yönergesi](docs/YEDEK.md)

## Kullanıcı akışı

Kayıtta Öğretmen, Öğrenci veya Bireysel hesap seçilir. Tek **Hesabım** alanı role göre düzenlenir. Öğretmen kendi sınıflarını, ödevlerini ve yetkili olduğu öğrenci sonuçlarını görür. Öğrenci kodla sınıfa katılır; sınıfa katılmadan da oyun oynayabilir. Bireysel hesap kişisel oyun içindir; veli takip hesabı değildir.

Profil adı ve şifre Hesap Ayarları içinde; ilerleme ve kazanımlar ayrı bölümlerdedir. Eski profil/panel bağlantıları yeni hesap alanına yönlendirilir. Geçmişte tanımlanan parent rolü yeni kayıt seçenekleri arasında değildir.

## Proje yapısı

- backend/: Flask API, modeller, migration dosyaları ve testler
- frontend/: React arayüzü, oyunlar, birim ve tarayıcı testleri
- docs/: kullanım ve teknik belgeler
- render.yaml, Dockerfile: dağıtım yapılandırması

## Yerel geliştirme

Python, Node.js ve PostgreSQL gerekir. Bu çalışma ortamında Python 3.14 ve Node.js 24 kullanılmıştır. Yerel ayarları backend/.env.example üzerinden oluşturun; gerçek parolaları Git’e eklemeyin. PostgreSQL bağlantısını kendi ortamınıza göre ayarlayın. Alternatif yerel veritabanı yapılandırması docker-compose.yml içindedir.

Backend (Windows PowerShell):

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# .env içindeki bağlantı ve anahtarları kendi ortamınıza göre düzenleyin.
flask --app run db upgrade
python seed.py
python run.py
```

Frontend (ayrı terminal):

```powershell
cd frontend
npm ci
npm run dev
```

Frontend http://localhost:5173, API http://localhost:5000/api adresindedir. Vite /api isteklerini yerel backend’e yönlendirir.

## Test ve derleme

```powershell
# Backend dizininde, sanal ortam etkin:
pip install -r requirements-dev.txt
$env:TEST_DATABASE_URL='sqlite:///:memory:'
python -m pytest

# Frontend dizininde:
npm test
npx playwright install chromium
npm run e2e
npm run build
```

Tarayıcı testlerinin çoğu API yanıtlarını taklit ederek arayüz davranışını sınar. Backend testleri SQLite kullanır. Bunlar canlı yük testi veya PostgreSQL dağıtım doğrulamasının yerine geçmez.

## Dağıtım ve teslim

Frontend API adresi VITE_API_URL ile belirlenir. Üretimde güçlü SECRET_KEY ve JWT_SECRET_KEY, doğru DATABASE_URL ve CORS_ORIGINS yapılandırılmalıdır. render.yaml dağıtım şablonudur; sağlayıcıdaki gerçek ayarlar ayrıca kontrol edilir. Backend açılışında migration ve katalog hazırlığı başlatılır; dağıtım günlüklerinde başarı doğrulanmalıdır.

Öğretmene web bağlantısı ve öğretmen teslim paketi gönderilir. android-package/ içeriği ve Google Play ZIP’i özel imzalama dosyaları içerebilir; paylaşılacak kullanıcı paketine veya Git’e eklenmez. Android ikililerinin sürümü web dağıtımından ayrı takip edilir.

PROJECT_SPEC.md ve DENETIM_RAPORU.md tarihsel teknik belgelerdir; güncel teslim kapsamı TESLIM_NOTLARI.md içindedir.
