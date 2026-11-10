# VitaeWorld · Alpha 0.6 (Vitae Hotel)

**Tarayıcıda çalışan, performans öncelikli, modüler birinci/üçüncü şahıs 3D dünya.** Mevcut GitHub deposu public; üretim için ticari/kişisel modellere ait lisanslara dikkat edilmelidir.

## Oyunu çalıştırma

```bash
npm install
npm run dev
```

Vite geliştirme sunucusunun adresini tarayıcıda açın (normalde `http://localhost:5173`). WebGL2 ve fiziksel klavye/fare ile kullanın. `npm run build` üretim derlemesi, `npm test` otomatik testler içindir.

## Alpha 0.6 özellikleri

- **Tutarlı yönler:** FPS kamerası, karakterin -Z ön ekseni, WASD hareketi, yan adım ve üçüncü şahıs kamera aynı yaw dönüşünü kullanır. `src/player/Orientation.js` için eksen ve çapraz hareket testleri var.
- **Modern iç mekân:** Sıcak nötr duvarlar, dokulu sıva/taş/ahşap/kumaş yüzeyler, sade bir lobi ve yumuşak beyaz-amber ışık. Neon estetik yalnızca şehir manzarasında. Dokular 256×256 CanvasTexture ile istemci içinde üretilir, uzak HTTP bağımlılığı yoktur.
- **Kat döşemesi düzeltmesi:** Çakışan merdiven giriş slabı kaldırıldı; üst kat panelleri artık çakışmıyor. Üst kat zemini ve alt kat tavanının ayrı, aralıklı yüzeyleri var. Merdiven boşlukları korunuyor.
- **Anime etkili organik avatar:** Yuvarlatılmış anatomi, ayrı iç tişört/ceket/pantolon/ayakkabı katmanları, el parmakları, baş, burun, ağız, kulak, kaş, göz kapakları, iris ve göz bebeği. Beş ten tonu, dört göz rengi ve yeni saç modelleri. FPS elleri de seçilen ten ve kıyafetle eşleşir. Kol ve bacaklarda artık **iki kemikli gerçek Three.js SkinnedMesh** kullanılır. Ten ve kıyafet katmanları aynı iskelete bağlanır; yüz, göz kırpma ve saç düşük maliyetli prosedüreldir. Bu varsayılan sistem tam VRM yüz rig veya profesyonel motion capture kalitesinde değildir.


- **47–50. katlar:** Kule dışına/şehir zeminine erişim yok. Dört iç kat birbirine fiziksel, zıt yönlü merdivenlerle bağlı. Asansör alternatif hızlı geçiştir.
- **Gece Neon City (yalnızca dışarıda):** Şehir zemini 118 metre aşağıda; statik placeholder binalar, aydınlık pencereler, yollar, trafik ışıkları, yıldızlı gece göğü ve neon cephe. Şehir tamamen prosedüreldir, dışarıdan model/doku indirilmez.
- **FPS/TPS:** Pointer-lock birinci şahıs, `O` ile üçüncü şahıs, WASD hareket, Shift koşma, Space zıplama, Ctrl ile kemik tabanlı çömelme, çift Ctrl ile yerde oturma, Ctrl+Space veya N ile diz çökme, oda kapıları/yatak/sandalye.
- **Ayrı el kontrolü:** Sol fare sol eli, sağ fare sağ eli uzatır. Yakındaki küçük nesneyi NPC elini veya duvar/korkuluk gibi sabit yüzeyi hedefleyip tutmaya çalışır. Sabit yüzeye tutununca çekme oyuncuyu hareket ettirir. Basılı tutarken fare tekerleği itme/çekme mesafesini değiştirir. Bırakma: fare tuşunu bırakma veya `F`.
- **Yerel fizik:** Sabit zaman adımlı, kütleli, sönümlü yay tabanlı taşınabilir nesneler, yerçekimi ve basit statik çarpışmalar. Çok oyunculu, dönme/tam hacim temasları, kinematik ağ tahmini veya genel amaçlı Rapier motoru yoktur.
- **İki simüle karakter:** Mira (resepsiyon) ve Nova (misafir). `E` ile konuşulur, uygun açıdan elleri tutulabilir ve kısıtlı biçimde çekilebilir. **Diğer gerçek oyuncularla ağ bağlantısı henüz yoktur.**
- **Avatar özelleştirme:** `K` ile bedensel ölçüler (metre), kıyafet, saç, ten tonu, göz rengi ve gözlük; JSON profil localStorage'da saklanır. Prosedürel modellerde yüz ve ayrık kıyafet katmanları bulunur ve kol/bacak skinned mesh iskeleti kullanılır. Harici VRM/GLB yüklenebilir, ancak bu dosyaların beden ölçüleri varsayılan karakter kadar özelleştirilemez.
- **Optimizasyon:** InstancedMesh geometri gruplama, paylaşımlı malzemeler, gölge haritası kapalı, harici font yok, adaptif çözünürlük ve 10 Hz HUD.

## Kontroller

| Tuş | İşlev |
| --- | --- |
| WASD, Fare | Yürü, bakış açısını değiştir |
| Shift / Space / Ctrl | Koş / zıpla / basılıyken çömel |
| Çift Ctrl | Bulunduğu yerde yere otur / kalk |
| Ctrl + Space (veya N) | Bulunduğu yerde diz çök / kalk. Bazı işletim sistemlerinde Ctrl+Space IME kısayoludur. |
| E | Kapı, mobilya, asansör veya NPC ile etkileşim |
| Sol fare basılı | Sol eli uzat / hedefi kavra |
| Sağ fare basılı | Sağ eli uzat / hedefi kavra |
| Fare tekerleği (tutarken) | Kavrama mesafesini artır / azalt |
| Fare tuşunu bırak veya F | Kavramayı serbest bırak |
| O | FPS / TPS kamera geçişi |
| K | Karakter özelleştirici |
| Esc | Fare kilidinden çık |

## Yeni postür ve iskelet sistemi

- `Ctrl` basılı: dizler ve kalça kademeli biçimde bükülür, göz hizası alçalır ve hareket yavaşlar. `O` ile üçüncü kişi görünümünde iskelet animasyonu izlenebilir.
- `Ctrl` iki ayrı basış: yerde oturmaya geçer. Aynı kombinasyon yeniden basıldığında ayağa kalkar. İlk bakışta animasyonun görülmesi için yerdeki duruşlar kamerayı **geçici olarak** üçüncü kişiye alır.
- `Ctrl + Space` veya `N`: diz çökme/ayağa kalkma. Zıplama 95 ms bekletilerek tuş sırası çatışması giderilmiştir.
- Durum geçişleri `src/player/PostureControls.js` içindeki saf girdi durum makinesiyle yönetilir.
- Varsayılan karakter: 8 ayrı skinned mesh yüzeyi, ayrı giyim parçaları, yumuşak kemik ağırlıkları ve göz kırpma.
- Karakter stüdyosundaki **GLB / VRM yükle** denetimi kullanıcıya ait iskeletli bir dosyayı **yalnızca tarayıcıda** açar. Üçüncü parti dosyalar proje deposuna eklenmez, sunucuya yüklenmez ve yeniden açıldığında korunmaz. Yükleme esnasında Three.js GLTFLoader, VRM dosyaları için isteğe bağlı pixiv three-vrm kullanılır. İskelet adları uyumluluğu modelden modele değişebilir.
- **Sınır:** İçe aktarılan GLB/VRM gövde oranlarını ayrı ayrı değiştirme henüz desteklenmez, sadece genel boyuna ölçeklenir. VRM/GLB animasyonlarının kalitesi seçilen dosyaya bağlıdır.

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
    PostureControls.js    # Ctrl/Space kombinasyonları ve gecikmeli zıplama
    HandRig.js            # FPS kamera kol/elleri
  avatar/
    Avatar.js             # Anatomik temel, yüz, katmanlı kıyafet, skinned mesh ve hareket
    SkinnedLimb.js        # Kemik ağırlıklı kol/bacak cilt ve giyim yüzeyi
    PoseMath.js           # Çömelme/oturma/diz çökme kemik hedefleri
    ModelImporter.js      # Lokal VRM/GLB, dinamik VRM modülü
    AvatarConfig.js       # Profil şeması, sınırlandırma
  ui/
    Hud.js                # HUD, avatar ayarları, asansör
```

## Sınırlar ve öncelikler

Bu bir **vertical slice prototipidir**. Tam 3D rigid-body solver, full-body inverse kinematics, oda editörü, gerçek oyuncular arası el tutma, multiplayer, anti-cheat ve yüksek kaliteli profesyonel mocap animasyonları ve kapsamlı iskelet retargeting sonraki kilometre taşlarıdır. NPC tutuşu sınırlı kinematik yaklaşım kullanır; gerçek oyuncu için ağ ve otoriter eşzamanlama şarttır. Katlar 47-50 olarak etiketlenmiştir; alt kule ve uzak şehir **dekoratiftir**. Sadece iç mekân erişilebilir.

Tarayıcı performansını korumak için uzak dekoratif binalar fizik hesaplamasına eklenmez ve aynı renkli kutular tek çizim çağrısında gruplanır. Yeni sistemler modül olarak eklenmelidir; main.js içinde iş mantığı büyütülmemelidir.

## GitHub Pages

Vite proje yolu `base: /games/` olarak `vite.config.js` ile üretilir. GitHub Actions, testlerden sonra `dist/` klasörünü GitHub Pages'e dağıtır. Canlı site: https://vitae0.github.io/games/ (başarılı deploy ve Pages ayarı gerektirir). Eski oyun/simülasyon sitesi `archive/` klasöründe, ayrıca Git geçmişi dalında korunur. GitHub Pages statik barındırmadır; gerçek çok oyunculu sunucu çalıştırmaz.

## Model lisansları ve gelecek aktarım

Bu sürümde üçüncü taraf avatar/texture/model dosyası kullanılmadı. VRoid Hub ve diğer topluluk kaynakları her model için farklı kullanım ve yeniden dağıtım şartları koyabilir. Lisans doğrulanmadan dosya repoya yüklenmemelidir. Rigged GLB/VRM dosya içe aktarımı mevcut; tüm modellerin iskeletini ve yüz ifadelerini eksiksiz retarget etmek, el IK ve kıyafet fiziği ayrı ilerleme aşamalarıdır. Pixiv three-vrm (MIT) yalnızca VRM dosyası seçilince dinamik yüklenir.


## Mobil ve tablet desteği (Alpha 0.6)

- **Başlangıç:** Dokunmatik ekran algılandığında **DOKUN VE OYNA** düğmesiyle açılır. `Pointer Lock` veya fare gerekmez. Masaüstünde mobil kontrolleri denemek için `?touch` parametresi kullanılabilir. Masaüstü klavye/fare kontrolleri korunur.
- **Sol joystick:** Analog yürüme ve yön değiştirme (joystick hızın şiddetini de belirler).
- **Sağ ekran:** Parmağı sürükleyerek kamera açısını değiştir. Kamera hassasiyeti **⚙ Ayarlar** içinden 0.45–2.00× olarak değiştirilebilir.
- **Temel düğmeler:** Koş (basılı tut), Kullan, Zıpla, Sol El/Sağ El (basılı tut), Çömel (basılı tut), Çek/İt (basılı tut veya kısa dokun), Daha.
- **Daha menüsü:** Yere otur/kalk, diz çök/kalk, FPS/TPS kamera, tutuşu bırak, karakter düzenleyicisi. Asansör ve diğer mobilyalar için **Kullan** düğmesi.
- **Menüler:** Karakter düzenleyicisi, GLB/VRM dosya seçme, asansör ve grafik ayarları mobil kaydırmaya uygundur. Ekran dönerse veya uygulama arka plana alınırsa basılı düğmeler serbest bırakılır.
- **Performans:** Mobil cihazlarda başlangıç piksel oranı (DPR) 1.15 ile sınırlıdır. Otomatik modda düşük kare hızında dinamik çözünürlük azaltılır; minimum 0.55 DPR. Grafik ayarı: Otomatik / Düşük / Orta / Yüksek. Tercihler yalnızca cihazdaki `localStorage` alanına kaydedilir.
- **Yerleşim:** Dikey/yatay ekran, iOS/Android çentik/safe-area ve dinamik görünür yükseklik (`100dvh`) desteklenir. Yatay kullanım daha geniş görüş sağlar.

### Sınırlar ve beklentiler

Telefonun WebGL2 ve yeterli GPU belleği desteklemesi gerekir. Özellikle çok büyük kullanıcı GLB/VRM dosyaları düşük bellekli cihazlarda yavaş olabilir. Fizik ve karakter etkileşimleri hâlâ tek oyunculu prototiptir, gerçek çok oyunculu sistem değildir. Mobilde gerçek cihaz üzerinde etkileşim ve performans testlerinin yapılması önerilir; GitHub Actions otomatik test ve derleme yapar, bir cihaz çiftliği değildir.

## Quaternius 3D karakter denemesi

Karakter menüsündeki **Temel karakter** üzerinden Quaternius Superhero Male
veya önceki geometrik karakter seçilebilir. Yeni model varsayılan olup
yaklaşık 741 KB'lık GLB dosyası olarak yüklenir. İskelet korunmuştur,
ancak özgün dokular yerine tek renkli mat materyal kullanılmıştır.

**Kıyafet stili > Yok** ve dört bağımsız katman anahtarı şimdilik yalnızca
**önceki geometrik karakterin** tişört, ceket, pantolon ve ayakkabı yüzeylerini
gizler. Quaternius gövdesine kıyafet uyumu henüz uygulanmadı.

Kaynak, lisans ve kısıtlar: [QUATERNIUS_AVATAR_TRIAL.md](docs/QUATERNIUS_AVATAR_TRIAL.md).
