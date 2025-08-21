import { chromium } from 'playwright';
import https from 'https';
import fs from 'fs';

// Ortam değişkenlerinden bilgileri al
const email = process.env.EMAIL;
const password = process.env.PASSWORD;
const productDescription = process.env.DESCRIPTION;
const productImageUrl = process.env.IMAGE_URL;

console.log('Creati Studio automation başlatılıyor...');

async function takeScreenshot(page, name) {
    try {
        await page.screenshot({ path: `debug-${name}.png`, fullPage: true });
        console.log(`✅ Screenshot alındı: debug-${name}.png`);
    } catch (error) {
        console.log(`⚠️ Screenshot alınamadı: ${error.message}`);
    }
}

function downloadImage(url, filepath) {
    // ... (Bu fonksiyon aynı kalıyor, değişiklik yok)
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
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
      locale: 'en-US' 
    });
    
    const page = await context.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    page.setDefaultTimeout(60000);

    try {
        // 1. ANA SAYFAYA GİT
        console.log('1. Creati Studio ana sayfasına gidiliyor...');
        await page.goto('https://www.creati.studio/', { waitUntil: 'networkidle' });
        await takeScreenshot(page, '01-main-page');
        console.log('Ana sayfa yüklendi.');

        console.log('"Go Create" butonu aranıyor ve tıklanıyor...');
        await page.getByRole('link', { name: /Go Create/i }).click();
        
        // --- DOĞRU YÖNTEM: ÖNCE URL'NİN DEĞİŞMESİNİ BEKLE ---
        console.log('Login sayfasının yüklenmesi için URL değişikliği bekleniyor...');
        // URL'de "login" kelimesi geçene kadar bekle. En güvenilir yöntem bu.
        await page.waitForURL('**/login**', { timeout: 30000 });
        console.log('Login sayfasına başarıyla yönlendirildi.');
        await takeScreenshot(page, '02-login-page-loaded');

        // 2. LOGIN İŞLEMİ (Artık sayfanın doğru olduğundan eminiz)
        console.log('2. "Continue with email" butonuna tıklanıyor...');
        await page.getByRole('button', { name: /Continue with email/i }).click();
        await takeScreenshot(page, '03-after-continue-with-email');
        
        console.log('Email ve Şifre alanları dolduruluyor...');
        await page.locator('input[type="email"]').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await takeScreenshot(page, '04-login-filled');

        await page.getByRole('button', { name: /LOG IN\/SIGN UP/i }).click();
        console.log('Login butonu tıklandı.');

        await page.waitForURL('**/dashboard**', { timeout: 60000 });
        console.log('Başarıyla giriş yapıldı, dashboard yüklendi.');
        await takeScreenshot(page, '05-after-login-dashboard');

        // ... (kodun geri kalanı tamamen aynı, değişiklik yok) ...

        console.log('3. Cozy Bedroom edit sayfasına direkt gidiliyor');
        const templateURL = 'https://www.creati.studio/edit?label=CozyBedroom_icon_0801&parentLabel=Bags+%26+Accessories';
        await page.goto(templateURL, { waitUntil: 'networkidle' });
        await page.waitForSelector('text="Upload product image"');
        console.log('Template edit sayfası yüklendi.');
        await takeScreenshot(page, '06-cozy-bedroom-edit');

        console.log('4. Ürün görseli indiriliyor ve upload ediliyor');
        const tempImagePath = '/tmp/product_image.jpg';
        await downloadImage(productImageUrl, tempImagePath);
        console.log('Görsel başarıyla indirildi:', tempImagePath);

        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.getByRole('button', { name: 'Upload product image' }).click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(tempImagePath);
        
        try {
            await page.getByRole('button', { name: 'Got it!' }).click({ timeout: 5000 });
            console.log('Görsel yüklendi ve "Got it!" popup kapatıldı.');
        } catch (e) {
            console.log('Görsel yüklendi ("Got it!" popup bulunamadı, devam ediliyor).');
        }
        await takeScreenshot(page, '07-after-upload');
        
        console.log('5. Ürün açıklaması giriliyor');
        await page.locator('textarea[placeholder*="Type your speech text"]').fill(productDescription);
        console.log('Ürün açıklaması girildi.');
        await takeScreenshot(page, '08-after-description');

        console.log('6. Dil Türkçe olarak ayarlanıyor');
        await page.locator('button:has-text("English")').click();
        await page.locator('div[role="dialog"] >> text=Turkish').click();
        console.log('Dil Türkçe olarak seçildi.');
        await takeScreenshot(page, '09-after-language');

        console.log('7. Video oluşturma başlatılıyor');
        await page.getByRole('button', { name: 'Continue' }).click();
        
        await page.waitForURL('**/history/**', { timeout: 90000 });
        console.log('Video oluşturma sayfasına yönlendirildi.');
        await takeScreenshot(page, '10-final-state');
        
        console.log('✅ Otomasyon başarıyla tamamlandı!');

    } catch (error) {
        console.error('❌ Hata oluştu:', error);
        await takeScreenshot(page, 'error-state');
        throw error;
    } finally {
        await browser.close();
        console.log('Browser kapatıldı.');
    }
}

createVideo();
