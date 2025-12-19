// Videoları takip etmek için liste
const islenenVideolar = new WeakSet();

// URL temizleme (Site.com/video/123 -> Sadece bu kısmı alır)
function getCleanKey() {
    return "video_save_" + window.location.hostname + window.location.pathname;
}

function videoYakalandi(video) {
    if (islenenVideolar.has(video)) return;
    islenenVideolar.add(video);

    const videoKey = getCleanKey();
    console.log("🎥 Video Bulundu:", videoKey);

    // --- KALDIĞI YERDEN BAŞLATMA (PUSU MODU) ---
    chrome.storage.local.get([videoKey], function(result) {
        const kayitliSure = result[videoKey];
        
        if (kayitliSure && parseFloat(kayitliSure) > 5) {
            console.log(`✅ Hafızada kayıt var: ${kayitliSure} sn.`);
            
            const hedefSure = parseFloat(kayitliSure);

            // 1. Taktik: Metadata yüklenince dene (Normal siteler için)
            video.addEventListener('loadedmetadata', () => {
                video.currentTime = hedefSure;
            });

            // 2. Taktik: Oynatıcı videoyu oynatmaya başladığı an (Zorlu siteler için)
            // 'playing' olayı video gerçekten dönmeye başlayınca tetiklenir.
            const oynatmaBasladi = () => {
                // Eğer video daha baştaysa (reklam vs yüzünden sıfırlandıysa)
                // ve biz henüz ışınlamadıysak
                if (video.currentTime < 5 && !video.dataset.isinlandi) {
                    console.log("⚡ Video başladı, şimdi ışınlanıyor...");
                    video.currentTime = hedefSure;
                    video.dataset.isinlandi = "true"; // Bir daha elleme
                }
            };

            video.addEventListener('playing', oynatmaBasladi);
            
            // Bazen siteler 'playing' yerine 'canplay' tetikler
            video.addEventListener('canplay', () => {
                if(video.currentTime < 5 && !video.dataset.isinlandi) {
                     video.currentTime = hedefSure;
                }
            });
        }
    });

    // --- SÜREKLİ KAYIT ET ---
    let sonKayit = 0;
    video.addEventListener('timeupdate', () => {
        const simdi = Date.now();
        // Video oynuyorsa ve son kayıttan 1 saniye geçtiyse kaydet
        if (!video.paused && simdi - sonKayit > 1000) {
            sonKayit = simdi;
            let veri = {};
            veri[videoKey] = video.currentTime;
            chrome.storage.local.set(veri);
        }
    });
}

// --- AVCI MODU (Sürekli yeni video ara) ---
const gozcu = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
            if (node.tagName === 'VIDEO') videoYakalandi(node);
            if (node.querySelectorAll) {
                node.querySelectorAll('video').forEach(videoYakalandi);
            }
        });
    });
});

gozcu.observe(document.body, { childList: true, subtree: true });

// İlk açılış kontrolü
setTimeout(() => {
    document.querySelectorAll('video').forEach(videoYakalandi);
}, 1000);