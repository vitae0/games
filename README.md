# VitaeWorld · Alpha 0.4 (Vitae Hotel)

**Tarayıcıda çalışan, performans öncelikli, modüler birinci/üçüncü şahıs 3D dünya.** Mevcut GitHub deposu public; üretim için ticari/kişisel modellere ait lisanslara dikkat edilmelidir.

## Oyunu çalıştırma

```bash
npm install
npm run dev
```

Vite geliştirme sunucusunun adresini tarayıcıda açın (normalde `http://localhost:5173`). WebGL2 ve fiziksel klavye/fare ile kullanın. `npm run build` üretim derlemesi, `npm test` otomatik testler içindir.

## Alpha 0.4 özellikleri

- **Tutarlı yönler:** FPS kamerası, karakterin -Z ön ekseni, WASD hareketi, yan adım ve üçüncü şahıs kamera aynı yaw dönüşünü kullanır. `src/player/Orientation.js` için eksen ve çapraz hareket testleri var.
- **Modern iç mekân:** Sıcak nötr duvarlar, dokulu sıva/taş/ahşap/kumaş yüzeyler, sade bir lobi ve yumuşak beyaz-amber ışık. Neon estetik yalnızca şehir manzarasında. Dokular 256×256 CanvasTexture ile istemci içinde üretilir, uzak HTTP bağımlılığı yoktur.
- **Kat döşemesi düzeltmesi:** Çakışan merdiven giriş slabı kaldırıldı; üst kat panelleri artık çakışmıyor. Üst kat zemini ve alt kat tavanının ayrı, aralıklı yüzeyleri var. Merdiven boşlukları korunuyor.
- **Anime etkili organik avatar:** Yuvarlatılmış anatomi, ayrı iç tişört/ceket/pantolon/ayakkabı katmanları, el parmakları, baş, burun, ağız, kulak, kaş, göz kapakları, iris ve göz bebeği. Beş ten tonu, dört göz rengi ve yeni saç modelleri. FPS elleri de seçilen ten ve kıyafetle eşleşir. Bu bir özel skinned mesh veya tam yüz rig yerine düşük maliyetli prosedürel görselleştirmedir.


- **47–50. katlar:** Kule dışına/şehir zeminine erişim yok. Dört iç kat birbirine fiziksel, zıt yönlü merdivenlerle bağlı. Asansör alternatif hızlı geçiştir.
- **Gece Neon City (yalnızca dışarıda):** Şehir zemini 118 metre aşağıda; statik placeholder binalar, aydınlık pencereler, yollar, trafik ışıkları, yıldızlı gece göğü ve neon cephe. Şehir tamamen prosedüreldir, dışarıdan model/doku indirilmez.
- **FPS/TPS:** Pointer-lock birinci şahıs, `O` ile üçüncü şahıs, WASD hareket, Shift koşma, Space zıplama, Ctrl çömelme, çift Ctrl yerde oturma, Ctrl+Space diz çökme, oda kapıları/yatak/sandalye.
- **Ayrı el kontrolü:** Sol fare sol eli, sağ fare sağ eli uzatır. Yakındaki küçük nesneyi NPC elini veya duvar/korkuluk gibi sabit yüzeyi hedefleyip tutmaya çalışır. Sabit yüzeye tutununca çekme oyuncuyu hareket ettirir. Basılı tutarken fare tekerleği itme/çekme mesafesini değiştirir. Bırakma: fare tuşunu bırakma veya `F`.
- **Yerel fizik:** Sabit zaman adımlı, kütleli, sönümlü yay tabanlı taşınabilir nesneler, yerçekimi ve basit statik çarpışmalar. Çok oyunculu, dönme/tam hacim temasları, kinematik ağ tahmini veya genel amaçlı Rapier motoru yoktur.
- **İki simüle karakter:** Mira (resepsiyon) ve Nova (misafir). `E` ile konuşulur, uygun açıdan elleri tutulabilir ve kısıtlı biçimde çekilebilir. **Diğer gerçek oyuncularla ağ bağlantısı henüz yoktur.**
- **Avatar özelleştirme:** `K` ile bedensel ölçüler (metre), kıyafet, saç, ten tonu, göz rengi ve gözlük; JSON profil localStorage'da saklanır. Prosedürel modellerde yüz ve ayrık kıyafet katmanları bulunur ancak skinned mesh / yüz mimikleri ve hareket yakalama kalitesinde animasyonlar yoktur.
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
    FloorPlan.js          # Çakışmayan döşeme/merdiven boşluğu geometrisi
    SurfaceTextures.js    # Deterministik, çevrimdışı otel dokuları
    Stairwell.js          # Sürekli yaya fiziksel merdiven yüzeyi
    CitySkyline.js        # Seeded, dekoratif gece kenti
    Actors.js             # Offline simüle NPC, tutulan eller
  player/
    Player.js             # Hareket, kamera, iki el input
    Orientation.js        # Kamera + avatar + hareket ortak yönü
    HandRig.js            # FPS kamera kol/elleri
  avatar/
    Avatar.js             # Anatomik temel, yüz, katmanlı kıyafet ve hareket
    AvatarConfig.js       # Profil şeması, sınırlandırma
  ui/
    Hud.js                # HUD, avatar ayarları, asansör
```

## Sınırlar ve öncelikler

Bu bir **vertical slice prototipidir**. Tam 3D rigid-body solver, full-body inverse kinematics, oda editörü, gerçek oyuncular arası el tutma, multiplayer, anti-cheat ve yüksek kaliteli GLB/VRM animasyonları sonraki kilometre taşlarıdır. NPC tutuşu sınırlı kinematik yaklaşım kullanır; gerçek oyuncu için ağ ve otoriter eşzamanlama şarttır. Katlar 47-50 olarak etiketlenmiştir; alt kule ve uzak şehir **dekoratiftir**. Sadece iç mekân erişilebilir.

Tarayıcı performansını korumak için uzak dekoratif binalar fizik hesaplamasına eklenmez ve aynı renkli kutular tek çizim çağrısında gruplanır. Yeni sistemler modül olarak eklenmelidir; main.js içinde iş mantığı büyütülmemelidir.

## GitHub Pages

Vite proje yolu `base: /games/` olarak `vite.config.js` ile üretilir. GitHub Actions, testlerden sonra `dist/` klasörünü GitHub Pages'e dağıtır. Canlı site: https://vitae0.github.io/games/ (başarılı deploy ve Pages ayarı gerektirir). Eski oyun/simülasyon sitesi `archive/` klasöründe, ayrıca Git geçmişi dalında korunur. GitHub Pages statik barındırmadır; gerçek çok oyunculu sunucu çalıştırmaz.

## Model lisansları ve gelecek aktarım

Bu sürümde üçüncü taraf avatar/texture/model dosyası kullanılmadı. VRoid Hub ve diğer topluluk kaynakları her model için farklı kullanım ve yeniden dağıtım şartları koyabilir. Lisans doğrulanmadan dosya repoya yüklenmemelidir. Daha iyi yüz, el IK ve giyim simülasyonu için gelecekte rigged GLB/VRM pipeline hedefleniyor.
