# VitaeWorld geliştirme yol haritası

## Alpha 0.2 · Neon City dış manzara ve fizik (tamamlandı)

- [x] Fiziksel merdiven yükseltisi; 47-50. katlarla sınırlı iç hacim
- [x] Renk paletli, gece prosedürel şehir; alt kat görüntüsü, yollar ve trafik ışıkları
- [x] İki ayrı fare eli, hedef tutma ve mesafe kontrollü yay kısıtı
- [x] Basit dinamik küçük nesneler; etkileşimli kapılar, oturma, dinlenme
- [x] İki yerel NPC (resepsiyon ve misafir), konuşma ve deneysel el tutuşu
- [x] O ile üçüncü şahıs kamera
- [x] Birim testleri ve GitHub Actions otomatik derleme

## Alpha 0.3 · Kat hareketleri ve GitHub Pages (tamamlandı)

- [x] Yere oturma ve diz çökme için çift Ctrl / Ctrl+Space hareketleri
- [x] Pages üzerinde games ana sayfası ve archive/ koruması

## Alpha 0.4 · Tasarım ve avatar v2 (tamamlandı)

- [x] Kamera, karakter ve hareket yönlerinde ortak matris konvansiyonu + regresyon testleri
- [x] Ayrı kat tavanı ve zemini; merdiven panelinde koplanar çakışmayı kaldırma
- [x] Prosedürel sıva, taş, ahşap ve kumaş haritaları ile sade iç mekan
- [x] Göz, burun, ağız, kulak, kaş, saç, ten ve kıyafet katmanları
- [x] NPC ve FPS ellerinde daha organik formlar

## Alpha 0.5+ · Gelişmiş fizik ve animasyon

- [ ] Rapier WASM entegrasyonu ve genel amaçlı rigid-body / kısıt çözücü
- [ ] Oyuncu fizik kapsülü, raycast teması, gerçek merdiven/collision poligonları
- [ ] Kollar/eller için iki kollu IK, omuz ve dirsek limitleri, temas animasyonları
- [ ] Tutulan NPC'lerde animasyon ve fizik otoritesi; itme, düşme ve dengelenme
- [ ] Mobilya etkileşimleri (dolap, çekmece, eşya yerleştirme, taşıma)
- [ ] Kapalı portal iç mekânı ve şehir manzarası için frustum/LOD testleri
- [ ] Playwright görsel smoke testleri + GPU FPS benchmark

## Alpha 0.6+ · Çok oyunculu altyapı

- [ ] Server authoritative hareket ve el tutuşu kısıtı
- [ ] Network reconciliation, lag compensation, gripped object ownership
- [ ] Sosyal eylemler ve güvenlik/izin yönetimi; diğer oyuncu tutuşunu reddedebilmeli
- [ ] GLB/VRM yükleme, avatar skinning, hareket yakalama veya blend-tree animasyonları
- [ ] Oda ve şehir editörü; mod paketleri ve bağımlılık sınırları

Teknik kural: regressions + fps maliyetleri ölçülmeden yeni içerik büyük kitlelere açılmaz.


### Alpha 0.5 (2026-11-10)
- Fix: Ctrl double-tap/Space input state machine and jump precedence; auto temporary third-person for floor sitting / kneeling; N fallback for OS-level Ctrl+Space intercept.
- Add: Two-bone Three.js SkinnedMesh sleeves, skin and pants on baseline avatars; physically articulated knees/hips, posture blend, visible blinking.
- Add: Lazy local-only GLB/VRM import via GLTFLoader + three-vrm. No bundled restricted 3rd-party characters.
- Next: Skeleton retargeting with motion library; VRM expression + eye tracking; cloth skinning; benchmark low-powered browser; playwright gameplay regression.


### Alpha 0.6 · Mobile-first controls

- [x] Multitouch joystick, camera drag, two-hand grab/release, push/pull, run, crouch, jump
- [x] On-screen sit, kneel, interact, camera toggle and avatar controls
- [x] Responsive panels, dynamic viewport and safe-area insets
- [x] Pixel-ratio scaling and user-selectable graphics/sensitivity
- [x] Node unit tests for touch state and integration test for Player touch locomotion
- [ ] Manual verification on Android Chrome, iOS Safari and low-memory hardware
- [ ] Cross-device orientation, battery and thermal profiling
