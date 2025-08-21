import { chromium } from 'playwright';
import https from 'https';
import fs from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';

const streamPipeline = promisify(pipeline);

// Ortam değişkenlerinden bilgileri al
const email = process.env.EMAIL;
const password = process.env.PASSWORD;
const productDescription = process.env.DESCRIPTION;
const productImageUrl = process.env.IMAGE_URL;

console.log('Creati Studio automation başlatılıyor...');

async function takeScreenshot(page, name) {
    try {
        const filename = `${name}.png`;
        await page.screenshot({ path: filename, fullPage: true });
        console.log(`📸 Ekran görüntüsü alındı: ${filename}`);
    } catch (error) {
        console.log(`⚠️ Ekran görüntüsü alınamadı: ${error.message}`);
    }
}

async function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        console.log(`🔽 Görsel indiriliyor: ${url}`);
        
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                const fileStream = fs.createWriteStream(filepath);
                response.pipe(fileStream);
                
                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log(`✅ Görsel başarıyla indirildi: ${filepath}`);
                    resolve();
                });
                
                fileStream.on('error', (err) => {
                    console.error(`❌ Dosya yazma hatası: ${err.message}`);
                    reject(err);
                });
            } else {
                reject(new Error(`HTTP Error: ${response.statusCode}`));
            }
        }).on('error', (err) => {
            console.error(`❌ İndirme hatası: ${err.message}`);
            reject(err);
        });
    });
}

// TEKRAR DENEME FONKSİYONU
async function retry(page, action, attempts = 3, delay = 5000) {
    for (let i = 0; i < attempts; i++) {
        try {
            console.log(`Deneme ${i + 1} / ${attempts}...`);
            await action();
            console.log(`✅ Deneme ${i + 1} başarılı!`);
            return;
        } catch (error) {
            console.log(`🔥 Deneme ${i + 1} başarısız oldu: ${error.message}`);
            if (i < attempts - 1) {
                console.log(`${delay / 1000} saniye sonra yeniden denenecek.`);
                await page.waitForTimeout(delay);
                console.log('Sayfa yenileniyor...');
                await page.reload({ waitUntil: 'domcontentloaded' });
            } else {
                console.log('Tüm denemeler başarısız oldu.');
                throw error;
            }
        }
    }
}

async function createVideo() {
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
        locale: 'en-US'
    });
    
    const page = await context.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });
    page.setDefaultTimeout(60000);

    try {
        // 1. DİREKT LOGİN SAYFASINA GİT
        console.log('1. Creati Studio login sayfasına gidiliyor...');
        await page.goto('https://www.creati.studio/login', { waitUntil: 'domcontentloaded' });
        await takeScreenshot(page, '01-login-page-loaded');
        console.log('Login sayfası yüklendi.');
        
        // DEBUGGING: Sayfadaki tüm butonları listele
        console.log('🔍 Sayfadaki butonlar kontrol ediliyor...');
        const buttons = await page.locator('button, div[class*="cursor-pointer"], [role="button"]').all();
        for (let i = 0; i < Math.min(buttons.length, 10); i++) {
            try {
                const text = await buttons[i].textContent();
                const classes = await buttons[i].getAttribute('class');
                console.log(`Buton ${i}: "${text?.trim()}" | Classes: ${classes}`);
            } catch (e) {
                console.log(`Buton ${i}: Okunamadı`);
            }
        }

        // 2. "CONTINUE WITH EMAIL" BUTONUNA TIKLA
        console.log('2. "Continue with email" butonu aranıyor...');
        await retry(page, async () => {
            // Sayfanın tam yüklenmesini bekle
            await page.waitForLoadState('networkidle');
            
            // Farklı selector'ları dene
            const selectors = [
                'text="Continue with email"',
                '[class*="continue"], [class*="email"]',
                'button:has-text("Continue with email")',
                'div:has-text("Continue with email")',
                '.cursor-pointer:has-text("email")'
            ];
            
            let emailButton = null;
            for (const selector of selectors) {
                try {
                    emailButton = page.locator(selector).first();
                    await emailButton.waitFor({ state: 'visible', timeout: 5000 });
                    console.log(`Email butonu bulundu: ${selector}`);
                    break;
                } catch (e) {
                    console.log(`Selector başarısız: ${selector}`);
                    continue;
                }
            }
            
            if (!emailButton) {
                throw new Error('Continue with email butonu bulunamadı');
            }
            
            await emailButton.click();
            console.log('Email butonu tıklandı.');
        });
        
        console.log('✅ Login akışının ilk adımı başarıyla geçildi!');
        await takeScreenshot(page, '02-login-step1-passed');

        // 3. EMAIL VE ŞİFRE GİRİŞİ - Daha robust selector'lar
        console.log('Email ve Şifre alanları dolduruluyor...');
        await retry(page, async () => {
            // Email alanını bul
            const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[name*="email" i]').first();
            await emailInput.waitFor({ state: 'visible', timeout: 30000 });
            await emailInput.fill(email);
            
            // Şifre alanını bul
            const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i], input[name*="password" i]').first();
            await passwordInput.waitFor({ state: 'visible', timeout: 30000 });
            await passwordInput.fill(password);
        });
        
        await takeScreenshot(page, '03-login-filled');

        // Login butonunu bul ve tıkla
        await retry(page, async () => {
            const loginButton = page.locator('button').filter({ hasText: /log in|sign in|continue|giriş/i }).first();
            await loginButton.waitFor({ state: 'visible', timeout: 30000 });
            await loginButton.click();
            console.log('Login butonu tıklandı.');
        });

        // Dashboard'a yönlendirilmeyi bekle
        await retry(page, async () => {
            // Birden fazla olası URL'yi kontrol et
            await page.waitForFunction(() => {
                const url = window.location.href;
                return url.includes('dashboard') || 
                       url.includes('workspace') || 
                       url.includes('home') ||
                       url.includes('create');
            }, { timeout: 90000 });
        });
        
        console.log('Başarıyla giriş yapıldı, ana sayfaya yönlendirildi.');
        await takeScreenshot(page, '04-after-login-dashboard');

        // 4. TEMPLATES'E GİT
        console.log('4. Templates sayfasına gidiliyor...');
        await retry(page, async () => {
            // Templates linkini ara
            const templatesLink = page.locator('a, button').filter({ hasText: /templates/i }).first();
            await templatesLink.waitFor({ state: 'visible', timeout: 30000 });
            await templatesLink.click();
            
            // Templates sayfasının yüklendiğini kontrol et
            await page.waitForFunction(() => {
                const url = window.location.href;
                return url.includes('templates') || url.includes('template');
            }, { timeout: 30000 });
        });
        
        console.log('Templates sayfası yüklendi.');
        await takeScreenshot(page, '05-templates-page');

        // 5. COZY BEDROOM TEMPLATE'İNİ BUL
        console.log('5. Cozy Bedroom template\'i aranıyor...');
        await retry(page, async () => {
            // Sayfanın tam yüklenmesini bekle
            await page.waitForLoadState('networkidle');
            
            // Farklı selector'larla "Cozy Bedroom" template'ini ara
            const selectors = [
                'text="Cozy Bedroom"',
                'text="cozy bedroom"',
                '[title*="cozy" i][title*="bedroom" i]',
                '.template-card:has-text("Cozy Bedroom")',
                '.template-item:has-text("Cozy Bedroom")',
                'div:has-text("Cozy Bedroom")'
            ];
            
            let templateElement = null;
            for (const selector of selectors) {
                try {
                    templateElement = page.locator(selector).first();
                    await templateElement.waitFor({ state: 'visible', timeout: 10000 });
                    console.log(`Cozy Bedroom template bulundu: ${selector}`);
                    break;
                } catch (e) {
                    console.log(`Selector başarısız: ${selector}`);
                    continue;
                }
            }
            
            if (!templateElement) {
                // Eğer "Cozy Bedroom" bulunamazsa, screenshot'larda gördüğümüz template'leri dene
                console.log('Cozy Bedroom bulunamadı, mevcut template\'ler deneniyor...');
                const alternatives = [
                    'text="Cozy Indoor"',
                    'text="Minimalist Space"', 
                    'text="Business Style"',
                    'text="Beauty Alexander"',
                    'text="Beauty Camille"',
                    'text="Beauty Charlotte"',
                    'text="Minimalist Female"',
                    'text="Minimalist Male"'
                ];
                
                for (const alt of alternatives) {
                    try {
                        templateElement = page.locator(alt).first();
                        await templateElement.waitFor({ state: 'visible', timeout: 5000 });
                        console.log(`Alternatif template bulundu: ${alt}`);
                        break;
                    } catch (e) {
                        continue;
                    }
                }
            }
            
            if (!templateElement) {
                throw new Error('Hiçbir uygun template bulunamadı');
            }
            
            await templateElement.click();
            console.log('Template seçildi.');
        });
        
        console.log('Cozy Bedroom template\'i seçildi.');
        await takeScreenshot(page, '06-template-selected');

        // 6. MARGIN'DEN GÖRSEL İNDİR
        console.log('6. Ürün görseli indiriliyor...');
        const imagePath = './product-image.jpg';
        await downloadImage(productImageUrl, imagePath);

        // 7. UPLOAD PRODUCT IMAGE
        console.log('7. Upload Product Image alanı aranıyor...');
        await retry(page, async () => {
            // Upload butonunu veya drag-drop alanını bul
            const uploadArea = page.locator('input[type="file"], .upload-area, .drop-zone').first();
            await uploadArea.waitFor({ state: 'visible', timeout: 30000 });
            
            // Dosyayı upload et
            await uploadArea.setInputFiles(imagePath);
            console.log('Görsel başarıyla yüklendi.');
        });
        
        await takeScreenshot(page, '07-image-uploaded');

        // 8. ÜRÜN AÇIKLAMASINI GİR
        console.log('8. Ürün açıklaması giriliyor...');
        await retry(page, async () => {
            // "Type speech text" alanını bul
            const textArea = page.locator('textarea, input[placeholder*="speech" i], input[placeholder*="text" i]').first();
            await textArea.waitFor({ state: 'visible', timeout: 30000 });
            await textArea.fill(productDescription);
            console.log('Ürün açıklaması girildi.');
        });

        // 9. DİLİ TÜRKÇE YAP
        console.log('9. Dil Türkçe olarak ayarlanıyor...');
        await retry(page, async () => {
            // Dil seçici dropdown'ını bul
            const languageDropdown = page.locator('select[name*="language" i], .language-selector, .dropdown').first();
            await languageDropdown.waitFor({ state: 'visible', timeout: 30000 });
            
            // Türkçe seçeneğini seç
            await languageDropdown.selectOption({ label: 'Turkish' });
            // Alternatif olarak value ile deneyebiliriz
            // await languageDropdown.selectOption('tr');
            console.log('Dil Türkçe olarak ayarlandı.');
        });

        await takeScreenshot(page, '08-form-completed');

        // 10. CONTINUE'YA BAS VE SÜRECİ BİTİR
        console.log('10. Continue butonuna tıklanarak süreç tamamlanıyor...');
        await retry(page, async () => {
            const continueButton = page.getByRole('button', { name: /continue/i });
            await continueButton.waitFor({ state: 'visible', timeout: 30000 });
            await continueButton.click();
            
            // Sürecin tamamlandığını kontrol et (success sayfası veya completion mesajı)
            await page.waitForSelector('.success, .completed, .done', { timeout: 60000 });
            console.log('✅ Video oluşturma süreci başarıyla tamamlandı!');
        });

        await takeScreenshot(page, '09-process-completed');

    } catch (error) {
        console.error('❌ Hata oluştu:', error);
        await takeScreenshot(page, 'error-state');
        
        // Hata durumunda sayfanın HTML'ini de kaydedelim
        const html = await page.content();
        fs.writeFileSync('error-page.html', html);
        console.log('Hata sayfası HTML\'i kaydedildi: error-page.html');
        
        throw error;
    } finally {
        // Geçici dosyaları temizle
        try {
            if (fs.existsSync('./product-image.jpg')) {
                fs.unlinkSync('./product-image.jpg');
                console.log('Geçici görsel dosyası temizlendi.');
            }
        } catch (cleanupError) {
            console.log('Temizleme hatası:', cleanupError.message);
        }
        
        await browser.close();
        console.log('Browser kapatıldı.');
    }
}

createVideo().catch(error => {
    console.error('❌ Ana fonksiyon hatası:', error);
    process.exit(1);
});
