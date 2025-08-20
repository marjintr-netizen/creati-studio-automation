import { chromium } from 'playwright';
import https from 'https';
import fs from 'fs';

// Ortam değişkenlerinden bilgileri al
const email = process.env.EMAIL;
const password = process.env.PASSWORD;
const productDescription = process.env.DESCRIPTION;
const productImageUrl = process.env.IMAGE_URL;

console.log('Creati Studio automation başlatılıyor...');

// Hata ayıklama için ekran görüntüsü alma fonksiyonu
async function takeScreenshot(page, name) {
    try {
        await page.screenshot({ path: `debug-${name}.png`, fullPage: true });
        console.log(`Screenshot alındı: debug-${name}.png`);
    } catch (error) {
        console.log(`Screenshot alınamadı: ${error.message}`);
    }
}

// Görseli URL'den indirme fonksiyonu
function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Görsel indirilemedi, status code: ${response.statusCode}`));
                return;
            }
            const file = fs.createWriteStream(filepath);
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(filepath);
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => {});
            reject(err);
        });
    });
}

async function createVideo() {
    const browser = await chromium.launch({
        headless: true, // GitHub Actions üzerinde true olmalı
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    // Daha yaygın bir ekran çözünürlüğü
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    try {
        // 1. LOGIN İŞLEMİ
        console.log('1. Creati Studio login sayfasına gidiliyor');
        await page.goto('https://www.creati.studio/login');

        // Sabit bekleme yerine, e-posta giriş alanının yüklenmesini bekle
        await page.waitForSelector('input[type="email"]', { timeout: 15000 });
        console.log('Login sayfası yüklendi');
        await takeScreenshot(page, '01-login-page');

        await page.locator('input[type="email"]').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await takeScreenshot(page, '02-login-filled');

        // Login butonuna tıkla
        await page.locator('button:has-text("LOG IN/SIGN UP")').click();
        console.log('Login butonu tıklandı');

        // Dashboard'un yüklendiğini doğrulamak için 'Home' text'ini bekle
        await page.waitForSelector('text=Home', { timeout: 20000 });
        console.log('Başarıyla giriş yapıldı, dashboard yüklendi');
        await takeScreenshot(page, '03-after-login');

        // 2. DİREKT OLARAK TEMPLATE EDİT SAYFASINA GİTMEK
        // Bu yaklaşım (önceki kodunda da var), UI'da gezinmekten çok daha stabildir.
        console.log('2. Cozy Bedroom edit sayfasına direkt gidiliyor');
        const templateURL = 'https://www.creati.studio/edit?label=CozyBedroom_icon_0801&parentLabel=Bags+%26+Accessories';
        await page.goto(templateURL);

        // Edit sayfasının yüklendiğini doğrulamak için "Upload product image" butonunu bekle
        await page.waitForSelector('text="Upload product image"', { timeout: 20000 });
        console.log('Template edit sayfası yüklendi');
        await takeScreenshot(page, '04-cozy-bedroom-edit');

        // 3. ÜRÜN GÖRSELİNİ YÜKLEME
        console.log('3. Ürün görseli upload ediliyor');
        const tempImagePath = '/tmp/product_image.jpg';
        await downloadImage(productImageUrl, tempImagePath);
        console.log('Görsel başarıyla indirildi:', tempImagePath);

        // Playwright'in dosya seçme olayını dinlemesi en güvenilir yoldur.
        // Önce 'filechooser' olayını bekle, sonra butona tıkla.
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.locator('button:has-text("Upload product image")').click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(tempImagePath);

        console.log('Dosya seçme penceresi açıldı ve görsel seçildi');
        // Yüklemenin tamamlanması için bir süre bekle (örneğin bir progress bar'ın kaybolması)
        // Burada, yükleme sonrası çıkan bir element beklenmeli. Şimdilik 'Got it!' butonu bekleyelim.
        await page.waitForSelector('button:has-text("Got it!")', { timeout: 15000 });
        await page.locator('button:has-text("Got it!")').click(); // Popup'ı kapat
        console.log('Görsel yüklendi ve popup kapatıldı');
        await takeScreenshot(page, '05-after-upload');
        
        // 4. ÜRÜN AÇIKLAMASINI GİRME
        console.log('4. Ürün açıklaması giriliyor');
        const descriptionInput = page.locator('textarea[placeholder*="Type your speech text"]');
        await descriptionInput.waitFor({ state: 'visible', timeout: 10000 });
        await descriptionInput.fill(productDescription);
        console.log('Ürün açıklaması girildi');
        await takeScreenshot(page, '06-after-description');

        // 5. DİLİ TÜRKÇE OLARAK SEÇME
        console.log('5. Dil Türkçe olarak ayarlanıyor');
        // Bu genellikle bir `select` elementi değil, tıklandığında menü açan bir `div` veya `button`'dır.
        // Önce dil menüsünü açan butona tıkla
        await page.locator('button:has(span:text-matches("English", "i"))').click();
        
        // Açılan menüden Türkçe'yi seç
        // Menünün görünür olmasını bekle
        await page.waitForSelector('text=Turkish', { state: 'visible' });
        await page.locator('text=Turkish').first().click();
        console.log('Dil Türkçe olarak seçildi');
        await takeScreenshot(page, '07-after-language');

        // 6. VİDEO OLUŞTURMA İŞLEMİNİ BAŞLATMA
        console.log('6. Video oluşturma başlatılıyor');
        const continueButton = page.locator('button:has-text("Continue")');
        await continueButton.waitFor({ state: 'enabled', timeout: 10000 }); // Butonun tıklanabilir olmasını bekle
        await continueButton.click();
        console.log('Continue butonuna tıklandı');
        
        // Genellikle bu tür işlemlerden sonra bir yüklenme animasyonu veya yeni bir sayfa gelir.
        // İşlemin başarıyla başladığını teyit etmek için bir sonraki adımı beklemek önemlidir.
        // Örneğin, 'History' sayfasının URL'sini veya "generating" durumunu bekleyebiliriz.
        await page.waitForURL('**/history/**', { timeout: 30000 });
        console.log('Video oluşturma sayfasına yönlendirildi.');
        await takeScreenshot(page, '08-final-state');
        
        console.log('✅ Otomasyon başarıyla tamamlandı!');

    } catch (error) {
        console.error('❌ Hata oluştu:', error);
        await takeScreenshot(page, 'error-state');
        // Hatanın GitHub Actions loglarında görünmesi için tekrar fırlat
        throw error;
    } finally {
        await browser.close();
        console.log('Browser kapatıldı.');
    }
}

// Script'i çalıştır
createVideo();
