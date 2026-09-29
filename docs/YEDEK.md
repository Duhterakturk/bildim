# Veritabanı yedeği

Skorlar Neon'da durur. Her pazar sabahı saat 03:00'te (Türkiye) bir kopyası alınır, parola ile kilitlenir ve GitHub'da 90 gün saklanır. İndirilen dosya tek başına açılmaz. Kilidi açmak için yedek parolası gerekir. Bu parola GitHub'da durur; bu sayfada yazmaz.

Yedek, o anki skorların fotoğrafıdır. Geri yüklemek, yedekten sonraki yeni skorların üzerine yazar.

## Yedeği GitHub'dan indir

1. Tarayıcıda [github.com/Duhterakturk/bildim](https://github.com/Duhterakturk/bildim) adresini aç.
2. Üst menüden **Actions** sekmesine gir.
3. Soldaki listeden **Haftalık yedek** işini seç.
4. Ortadaki listeden yeşil tikli bir çalıştırmayı aç. Tarih, yedeğin alındığı gündür.
5. Sayfanın altındaki **Artifacts** kutusunda `mindarena-yedek-2026-09-27.dump.gpg` gibi bir dosya görürsün. Adındaki tarih, yedeğin günüdür. Onu indir.
6. İnen dosya bir zip paketidir. Paketi aç. İçinden çıkan dosyanın adı `.dump.gpg` ile biter. Asıl yedek budur.

## Kilidi aç

Bilgisayarda Gpg4win kurulu olsun: [gpg4win.org](https://www.gpg4win.org/). Kurulumda varsayılan seçenekler yeter.

İndirdiğin `.dump.gpg` dosyasının bulunduğu klasörde PowerShell aç ve şunu yaz. Tarih kısmını dosyanın adındaki tarihle değiştir:

```
gpg --decrypt --output mindarena.dump mindarena-yedek-2026-09-27.dump.gpg
```

Parola sorunca GitHub'a kaydettiğin yedek parolasını yaz. Ekranda görünmez. Enter'a bas.

Aynı klasörde `mindarena.dump` oluşur. Bu dosya artık açık yedektir. İşin bitince onu sil. Zip'in içindeki `.dump.gpg` dosyasını saklayabilirsin; o kilitli kalır.

## Neon'a geri yükle

Bunu yalnız eski skorları geri getirmek istediğinde yap. Yedekten sonra girilen skorlar silinir.

1. Bilgisayarda PostgreSQL 18 komut satırı araçları kurulu olsun. [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) adresinden PostgreSQL 18'i kur. Kurulumda "Command Line Tools" seçili kalsın.
2. Neon'da projeni aç. **Connect** düğmesine bas. **Connection pooling** kapalı olsun (adresin içinde `-pooler` yazmasın). **Direct** bağlantıyı kopyala. Adres `sslmode=require` içersin.
3. `mindarena.dump` dosyasının klasöründe PowerShell aç. Tırnak içine, kopyaladığın adresi yapıştır:

```
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" --clean --if-exists --no-owner --no-acl --dbname "BURAYA-NEON-ADRESI" mindarena.dump
```

4. Komut bitince siteden bir hesabın skoruna bak. Yedekteki hali duruyorsa yükleme tamamdır.
5. `mindarena.dump` dosyasını sil. Açık yedek bilgisayarda kalmasın.
