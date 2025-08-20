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
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    page.setDefaultTimeout(30000);

    try {
        // 1. LOGIN İŞLEMİ
        console.log('1. Creati Studio login sayfasına gidiliyor');
        await page.goto('https://www.creati.studio/login', { waitUntil: 'networkidle' });
        await takeScreenshot(page, '01-login-page-loaded');
        console.log('Login sayfası yüklendi.');

        // --- YENİ GÜNCELLEME: Olası pop-up'ları veya çerez bildirimlerini kapatma ---
        // Bu blok, butonu bulursa tıklar, bulamazsa hata vermeden devam eder.
        try {
            console.log('Olası pop-up veya çerez butonu kontrol ediliyor...');
            // Web sitesindeki butonda yazabilecek yaygın metinleri arıyoruz.
            const acceptButton = page.locator('button:has-text("Accept"), button:has-text("Got it"), button:has-text("Allow"), button:has-text("Kabul Et")').first();
            await acceptButton.waitFor({ state: 'visible', timeout: 5000 }); // 5 saniye bekler, yoksa devam eder.
            console.log('Pop-up butonu bulundu, tıklanıyor.');
            await acceptButton.click();
            await takeScreenshot(page, '01a-popup-closed');
        } catch (e) {
            console.log('Kapatılacak bir pop-up bulunamadı, devam ediliyor.');
        }

        console.log('Email alanı bekleniyor...');
        const emailInput = page.locator('input[type="email"]');
        await emailInput.waitFor({ state: 'visible', timeout: 20000 });
        console.log('Email alanı bulundu.');
        
        await emailInput.fill(email);
        await page.locator('input[type="password"]').fill(password);
        await takeScreenshot(page, '02-login-filled');

        await page.locator('button:has-text("LOG IN/SIGN UP")').click();
        console.log('Login butonu tıklandı');

        await page.waitForSelector('text=Home', { timeout: 20000 });
        console.log('Başarıyla giriş yapıldı, dashboard yüklendi');
        await takeScreenshot(page, '03-after-login');

        // 2. DİREKT OLARAK TEMPLATE EDİT SAYFASINA GİTMEK
        console.log('2. Cozy Bedroom edit sayfasına direkt gidiliyor');
        const templateURL = 'https://www.creati.studio/edit?label=CozyBedroom_icon_0801&parentLabel=Bags+%26+Accessories';
        await page.goto(templateURL, { waitUntil: 'networkidle' });

        await page.waitForSelector('text="Upload product image"');
        console.log('Template edit sayfası yüklendi');
        await takeScreenshot(page, '04-cozy-bedroom-edit');

        // 3. ÜRÜN GÖRSELİNİ YÜKLEME
        console.log('3. Ürün görseli upload ediliyor');
        const tempImagePath = '/tmp/product_image.jpg';
        await downloadImage(productImageUrl, tempImagePath);
        console.log('Görsel başarıyla indirildi:', tempImagePath);

        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.locator('button:has-text("Upload product image")').click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(tempImagePath);
        console.log('Dosya seçme penceresi açıldı ve görsel seçildi');

        const gotItButton = page.locator('button:has-text("Got it!")');
        await gotItButton.waitFor({ state: 'visible', timeout: 20000 });
        await gotItButton.click();
        console.log('Görsel yüklendi ve popup kapatıldı');
        await takeScreenshot(page, '05-after-upload');
        
        // 4. ÜRÜN AÇIKLAMASINI GİRME
        console.log('4. Ürün açıklaması giriliyor');
        const descriptionInput = page.locator('textarea[placeholder*="Type your speech text"]');
        await descriptionInput.waitFor({ state: 'visible' });
        await descriptionInput.fill(productDescription);
        console.log('Ürün açıklaması girildi');
        await takeScreenshot(page, '06-after-description');

        // 5. DİLİ TÜRKÇE OLARAK SEÇME
        console.log('5. Dil Türkçe olarak ayarlanıyor');
        await page.locator('button:has(span:text-matches("English", "i"))').click();
        await page.waitForSelector('text=Turkish', { state: 'visible' });
        await page.locator('text=Turkish').first().click();
        console.log('Dil Türkçe olarak seçildi');
        await takeScreenshot(page, '07-after-language');

        // 6. VİDEO OLUŞTURMA İŞLEMİNİ BAŞLATMA
        console.log('6. Video oluşturma başlatılıyor');
        const continueButton = page.locator('button:has-text("Continue")');
        await continueButton.waitFor({ state: 'enabled' });
        await continueButton.click();
        console.log('Continue butonuna tıklandı');
        
        await page.waitForURL('**/history/**', { timeout: 60000 });
        console.log('Video oluşturma sayfasına yönlendirildi.');
        await takeScreenshot(page, '08-final-state');
        
        console.log('✅ Otomasyon başarıyla tamamlandı!');

    } catch (error) {
        console.error('❌ Hata oluştu:', error);
        await takeScreenshot(page, 'error-state');
        throw error; // Hatayı fırlatarak workflow'un başarısız olmasını sağlıyoruz
    } finally {
        await browser.close();
        console.log('Browser kapatıldı.');
    }
}

createVideo();
