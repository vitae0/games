# VitaeWorld · Alpha 0.3 (Neon Hotel)

**Tarayıcıda çalışan, performans öncelikli, modüler birinci/üçüncü şahıs 3D dünya.** Depo private tutulmalıdır.

## Oyunu çalıştırma

```bash
npm install
npm run dev
```

Vite geliştirme sunucusunun adresini tarayıcıda açın (normalde `http://localhost:5173`). WebGL2 ve fiziksel klavye/fare ile kullanın. `npm run build` üretim derlemesi, `npm test` otomatik testler içindir.

## Alpha 0.3 özellikleri

- **47–50. katlar:** Kule dışına/şehir zeminine erişim yok. Dört iç kat birbirine fiziksel, zıt yönlü merdivenlerle bağlı. Asansör alternatif hızlı geçiştir.
- **Gece Neon City:** Şehir zemini 118 metre aşağıda; statik placeholder binalar, aydınlık pencereler, yollar, trafik ışıkları, yıldızlı gece göğü ve neon cephe. Şehir tamamen prosedüreldir, dışarıdan model/doku indirilmez.
- **FPS/TPS:** Pointer-lock birinci şahıs, `O` ile üçüncü şahıs, WASD hareket, Shift koşma, Space zıplama, Ctrl çömelme, çift Ctrl yerde oturma, Ctrl+Space diz çökme, oda kapıları/yatak/sandalye.
- **Ayrı el kontrolü:** Sol fare sol eli, sağ fare sağ eli uzatır. Yakındaki küçük nesneyi NPC elini veya duvar/korkuluk gibi sabit yüzeyi hedefleyip tutmaya çalışır. Sabit yüzeye tutununca çekme oyuncuyu hareket ettirir. Basılı tutarken fare tekerleği itme/çekme mesafesini değiştirir. Bırakma: fare tuşunu bırakma veya `F`.
- **Yerel fizik:** Sabit zaman adımlı, kütleli, sönümlü yay tabanlı taşınabilir nesneler, yerçekimi ve basit statik çarpışmalar. Çok oyunculu, dönme/tam hacim temasları, kinematik ağ tahmini veya genel amaçlı Rapier motoru yoktur.
- **İki simüle karakter:** Mira (resepsiyon) ve Nova (misafir). `E` ile konuşulur, uygun açıdan elleri tutulabilir ve kısıtlı biçimde çekilebilir. **Diğer gerçek oyuncularla ağ bağlantısı henüz yoktur.**
- **Avatar özelleştirme:** `K` ile bedensel ölçüler (metre), kıyafet, saç ve vizör; JSON profil localStorage'da saklanır. Modeller prosedürel placeholder'lardır, hareket yakalama kalitesinde animasyonlar değildir.
- **Optimizasyon:** InstancedMesh geometri gruplama, paylaşımlı malzemeler, gölge haritası kapalı, harici font yok, adaptif çözünürlük ve 10 Hz HUD.

## Kontroller

| Tuş | İşlev |
| --- | --- |
| WASD, Fare | Yürü, bakış açısını değiştir |
| Shift / Space / Ctrl | Koş / zıpla / basılıyken çömel |
| Çift Ctrl | Bulunduğu yerde yere otur / kalk |
| Ctrl + Space | Bulunduğu yerde diz çök / kalk |
| E | Kapı, mobilya, asansör veya NPC ile etkileşim |
| Sol fare basılı | Sol eli uzat / hedefi kavra |
| Sağ fare basılı | Sağ eli uzat / hedefi kavra |
| Fare tekerleği (tutarken) | Kavrama mesafesini artır / azalt |
| Fare tuşunu bırak veya F | Kavramayı serbest bırak |
| O | FPS / TPS kamera geçişi |
| K | Karakter özelleştirici |
| Esc | Fare kilidinden çık |

## Modüler dosya yapısı

```text
src/
  main.js                 # Render loop, adaptif çözünürlük, UI bağlantısı
  config.js               # Haritalanabilir sabitler
  engine/
    BoxBatch.js           # Statik instancing
    Collision.js          # 2D disc-AABB dünya çarpışmaları
    PhysicsWorld.js       # Dinamik küçük nesne yayı + sabit zaman adımı
  world/
    Hotel.js              # Kat planı, kapılar, interaktif nesneler
    Stairwell.js          # Sürekli yaya fiziksel merdiven yüzeyi
    CitySkyline.js        # Seeded, dekoratif gece kenti
    Actors.js             # Offline simüle NPC, tutulan eller
  player/
    Player.js             # Hareket, kamera, iki el input
    HandRig.js            # FPS kamera kol/elleri
  avatar/
    Avatar.js             # Prosedürel model ve hareket
    AvatarConfig.js       # Profil şeması, sınırlandırma
  ui/
    Hud.js                # HUD, avatar ayarları, asansör
```

## Sınırlar ve öncelikler

Bu bir **vertical slice prototipidir**. Tam 3D rigid-body solver, full-body inverse kinematics, oda editörü, gerçek oyuncular arası el tutma, multiplayer, anti-cheat ve yüksek kaliteli GLB/VRM animasyonları sonraki kilometre taşlarıdır. NPC tutuşu sınırlı kinematik yaklaşım kullanır; gerçek oyuncu için ağ ve otoriter eşzamanlama şarttır. Katlar 47-50 olarak etiketlenmiştir; alt kule ve uzak şehir **dekoratiftir**. Sadece iç mekân erişilebilir.

Tarayıcı performansını korumak için uzak dekoratif binalar fizik hesaplamasına eklenmez ve aynı renkli kutular tek çizim çağrısında gruplanır. Yeni sistemler modül olarak eklenmelidir; main.js içinde iş mantığı büyütülmemelidir.

## GitHub Pages

Vite proje yolu `base: /games/` olarak `vite.config.js` ile üretilir. GitHub Actions, testlerden sonra `dist/` klasörünü GitHub Pages'e dağıtır. Canlı site: https://vitae0.github.io/games/ (başarılı deploy ve Pages ayarı gerektirir). Eski oyun/simülasyon sitesi `archive/` klasöründe (Pages çıktısına kopyalanır), ayrıca Git geçmişi dalında korunur. GitHub Pages statik barındırmadır; gerçek çok oyunculu sunucu çalıştırmaz.
