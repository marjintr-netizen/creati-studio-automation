import { chromium } from 'playwright';
import https from 'https-proxy-agent';
import fs from 'fs';

// Ortam değişkenlerinden bilgileri al
const email = process.env.EMAIL;
const password = process.env.PASSWORD;
const productDescription = process.env.DESCRIPTION;
const productImageUrl = process.env.IMAGE_URL;

console.log('Creati Studio automation başlatılıyor...');

async function takeScreenshot(page, name) {
    // ... (değişiklik yok)
}

function downloadImage(url, filepath) {
    // ... (değişiklik yok)
}

// --- YENİ: TEKRAR DENEME FONKSİYONU (BALYOZ) ---
async function retry(page, action, attempts = 3, delay = 5000) {
    for (let i = 0; i < attempts; i++) {
        try {
            console.log(`Deneme ${i + 1} / ${attempts}...`);
            await action();
            console.log(`✅ Deneme ${i + 1} başarılı!`);
            return; // Başarılı olursa fonksiyondan çık
        } catch (error) {
            console.log(`🔥 Deneme ${i + 1} başarısız oldu: ${error.message}`);
            if (i < attempts - 1) {
                console.log(`${delay / 1000} saniye sonra yeniden denenecek.`);
                await page.waitForTimeout(delay);
                // Bir sonraki denemeden önce sayfayı yenilemek bazen işe yarar
                console.log('Sayfa yenileniyor...');
                await page.reload({ waitUntil: 'domcontentloaded' });
            } else {
                console.log('Tüm denemeler başarısız oldu.');
                throw error; // Son denemede de hata olursa, programı durdur
            }
        }
    }
}


async function createVideo() {
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
      locale: 'en-US' 
    });
    
    const page = await context.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    page.setDefaultTimeout(60000); // Varsayılan zaman aşımı 60 saniye

    try {
        // 1. ANA SAYFAYA GİT
        console.log('1. Creati Studio ana sayfasına gidiliyor...');
        await page.goto('https://www.creati.studio/', { waitUntil: 'domcontentloaded' });
        await takeScreenshot(page, '01-main-page-loaded');
        console.log('Ana sayfa yüklendi.');

        // --- SORUNLU ADIM İÇİN BALYOZ YÖNTEMİNİ KULLAN ---
        await retry(page, async () => {
            console.log('Login akışı başlatılıyor: "Go Create" butonuna tıklanacak...');
            await page.getByRole('link', { name: /Go Create/i }).click();

            console.log('"Continue with email" butonunun görünmesi bekleniyor...');
            const continueWithEmailButton = page.getByRole('button', { name: /Continue with email/i });
            await continueWithEmailButton.waitFor({ state: 'visible', timeout: 45000 });
            
            console.log('"Continue with email" butonu bulundu. Tıklanıyor...');
            await continueWithEmailButton.click();
        });
        
        console.log('✅ Login akışının ilk adımı başarıyla geçildi!');
        await takeScreenshot(page, '02-login-step1-passed');

        // 2. LOGIN İŞLEMİ DEVAMI
        console.log('Email ve Şifre alanları dolduruluyor...');
        await page.locator('input[type="email"]').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await takeScreenshot(page, '03-login-filled');

        await page.getByRole('button', { name: /LOG IN\/SIGN UP/i }).click();
        console.log('Login butonu tıklandı.');

        await page.waitForURL('**/dashboard**', { timeout: 90000 });
        console.log('Başarıyla giriş yapıldı, dashboard yüklendi.');
        await takeScreenshot(page, '04-after-login-dashboard');
        
        // ... (kodun geri kalanı tamamen aynı) ...

    } catch (error) {
        console.error('❌ Hata oluştu:', error);
        await takeScreenshot(page, 'error-state');
        throw error;
    } finally {
        await browser.close();
        console.log('Browser kapatıldı.');
    }
}

// downloadImage ve takeScreenshot fonksiyonlarını buraya ekle
// ...

createVideo();
