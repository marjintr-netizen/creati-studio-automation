import { chromium } from 'playwright';
import https from 'https';
import fs from 'fs';

// N8N'den gelen environment variables
const email = process.env.EMAIL;
const password = process.env.PASSWORD;
const productDescription = process.env.DESCRIPTION;
const productImageUrl = process.env.IMAGE_URL;

console.log('Creati AI Hibrit Otomasyon başlatılıyor...');
console.log(`Ürün açıklaması: ${productDescription?.substring(0, 50)}...`);
console.log(`Görsel URL: ${productImageUrl}`);

async function takeScreenshot(page, name) {
    try {
        const filename = `${name}.png`;
        await page.screenshot({ path: filename, fullPage: true });
        console.log(`Screenshot: ${filename}`);
    } catch (error) {
        console.log(`Screenshot hatası: ${error.message}`);
    }
}

async function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        console.log(`Görsel indiriliyor: ${url}`);
        
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                const fileStream = fs.createWriteStream(filepath);
                response.pipe(fileStream);
                
                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log(`Görsel indirildi: ${filepath}`);
                    resolve();
                });
                
                fileStream.on('error', reject);
            } else {
                reject(new Error(`HTTP Error: ${response.statusCode}`));
            }
        }).on('error', reject);
    });
}

async function retry(page, action, attempts = 3, delay = 3000) {
    for (let i = 0; i < attempts; i++) {
        try {
            console.log(`Deneme ${i + 1}/${attempts}...`);
            await action();
            console.log(`Başarılı!`);
            return;
        } catch (error) {
            console.log(`Hata: ${error.message}`);
            if (i < attempts - 1) {
                console.log(`${delay/1000}s bekleyip tekrar deneniyor...`);
                await page.waitForTimeout(delay);
            } else {
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
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'en-US'
    });
    
    const page = await context.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });
    page.setDefaultTimeout(45000);

    try {
        console.log('\n=== HİBRİT YAKLAŞIM BAŞLIYOR ===');
        console.log('1. Otomatik login');
        console.log('2. Templates sayfasına git');
        console.log('3. MANUEL: Template seç (90 saniye beklenecek)');
        console.log('4. Otomatik: Upload + form + generate\n');

        // 1. LOGIN OTOMATIK
        console.log('ADIM 1: Login işlemi...');
        await page.goto('https://www.creati.studio/login', { waitUntil: 'domcontentloaded' });
        await takeScreenshot(page, '01-login-page');
        
        // Continue with email butonuna tıkla
        await retry(page, async () => {
            await page.waitForLoadState('networkidle');
            const emailBtn = page.locator('.cursor-pointer').filter({ hasText: /continue with email/i }).first();
            await emailBtn.waitFor({ state: 'visible', timeout: 20000 });
            await emailBtn.click();
            await page.waitForSelector('input[type="email"]', { timeout: 15000 });
        });

        // Email ve şifre gir
        await retry(page, async () => {
            await page.locator('input[type="email"]').fill(email);
            await page.locator('input[type="password"]').fill(password);
            await page.locator('button').filter({ hasText: /log in|sign up/i }).first().click();
        });

        // Dashboard'a yönlendirmeyi bekle
        await page.waitForFunction(() => {
            const url = window.location.href;
            return url.includes('dashboard') || url.includes('workspace') || url.includes('home');
        }, { timeout: 60000 });

        await takeScreenshot(page, '02-logged-in');
        console.log('Login başarılı!');

        // 2. TEMPLATES SAYFASINA GİT
        console.log('\nADIM 2: Templates sayfasına gidiliyor...');
        await retry(page, async () => {
            const templatesLink = page.locator('a, button').filter({ hasText: /templates/i }).first();
            await templatesLink.waitFor({ state: 'visible', timeout: 20000 });
            await templatesLink.click();
            await page.waitForTimeout(5000);
        });

        await takeScreenshot(page, '03-templates-page');
        console.log('Templates sayfası yüklendi.');

        // 3. MANUEL TEMPLATE SEÇİMİ - 90 SANİYE BEKLE
        console.log('\n*** MANUEL ADIM ***');
        console.log('ADIM 3: Template seçimi (90 saniye bekleniyor)...');
        console.log('Şu adımları yapın:');
        console.log('  • Bir template seçin (Cozy Bedroom, Beauty vb.)');
        console.log('  • Template\'e tıklayın');
        console.log('  • "Use" veya "Create" butonuna basın');
        console.log('  • Upload sayfasına kadar ilerleyin');
        console.log('  • Otomatik devam edecek...\n');
        
        // 90 saniye manuel süre
        for (let i = 90; i > 0; i--) {
            if (i % 15 === 0) {
                console.log(`Manuel süre kalan: ${i} saniye...`);
                await takeScreenshot(page, `04-manual-step-${90-i}s`);
            }
            await page.waitForTimeout(1000);
        }

        console.log('\nManuel süre bitti, otomatik kısım başlıyor...');
        await takeScreenshot(page, '05-after-manual-selection');

        // 4. GÖRSEL İNDİR
        console.log('\nADIM 4: Ürün görseli indiriliyor...');
        const imagePath = './product-image.jpg';
        await downloadImage(productImageUrl, imagePath);

        // 5. UPLOAD İŞLEMİ
        console.log('\nADIM 5: Görsel upload ediliyor...');
        await retry(page, async () => {
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);
            
            // Comprehensive upload selectors
            const uploadSelectors = [
                'input[type="file"]',
                'input[accept*="image"]',
                'button:has-text("Upload")',
                'div:has-text("Upload")',
                'button:has-text("Choose")',
                'div:has-text("Choose")', 
                'button:has-text("Browse")',
                '[data-testid*="upload"]',
                '[class*="upload"]:visible',
                '[class*="file"]:visible',
                '[class*="drop"]:visible',
                '.cursor-pointer:has([class*="upload"])',
                'text="Upload product image"',
                'text="Choose file"',
                'text="Browse files"'
            ];
            
            let uploaded = false;
            for (const selector of uploadSelectors) {
                try {
                    const elements = await page.locator(selector).all();
                    for (const element of elements) {
                        if (await element.isVisible()) {
                            console.log(`Upload alanı bulundu: ${selector}`);
                            
                            if (selector.includes('input[type="file"]') || selector.includes('input[accept')) {
                                await element.setInputFiles(imagePath);
                            } else {
                                await element.click();
                                await page.waitForTimeout(1500);
                                const hiddenInput = page.locator('input[type="file"]').first();
                                await hiddenInput.setInputFiles(imagePath);
                            }
                            
                            uploaded = true;
                            console.log('Görsel başarıyla yüklendi!');
                            break;
                        }
                    }
                    if (uploaded) break;
                } catch (e) {
                    continue;
                }
            }
            
            if (!uploaded) {
                throw new Error('Upload alanı bulunamadı');
            }
        });

        await takeScreenshot(page, '06-image-uploaded');

        // 6. ÜRÜN AÇIKLAMASI
        console.log('\nADIM 6: Ürün açıklaması giriliyor...');
        await retry(page, async () => {
            const textSelectors = [
                'textarea',
                'input[placeholder*="speech" i]',
                'input[placeholder*="text" i]',
                'input[placeholder*="description" i]',
                'input[placeholder*="script" i]',
                '[contenteditable="true"]',
                'input[type="text"]:visible'
            ];
            
            let textEntered = false;
            for (const selector of textSelectors) {
                try {
                    const textField = page.locator(selector).first();
                    await textField.waitFor({ state: 'visible', timeout: 8000 });
                    await textField.fill(productDescription);
                    console.log(`Açıklama girildi: ${selector}`);
                    textEntered = true;
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            if (!textEntered) {
                console.log('Text alanı bulunamadı, devam ediliyor...');
            }
        });

        // 7. DİL AYARI
        console.log('\nADIM 7: Dil Türkçe yapılıyor...');
        try {
            await retry(page, async () => {
                const languageSelectors = [
                    'select[name*="language" i]',
                    'select:visible',
                    'button:has-text("Language")',
                    'div:has-text("Language")',
                    '.language-selector'
                ];
                
                for (const selector of languageSelectors) {
                    try {
                        const langElement = page.locator(selector).first();
                        await langElement.waitFor({ state: 'visible', timeout: 5000 });
                        
                        if (selector.includes('select')) {
                            try {
                                await langElement.selectOption({ label: 'Turkish' });
                                console.log('Dil Türkçe yapıldı');
                                return;
                            } catch (e) {
                                await langElement.selectOption('tr');
                                console.log('Dil Türkçe yapıldı (tr)');
                                return;
                            }
                        } else {
                            await langElement.click();
                            await page.waitForTimeout(1000);
                            const turkishOption = page.locator('text="Turkish"').first();
                            await turkishOption.click();
                            console.log('Dil Türkçe yapıldı (click)');
                            return;
                        }
                    } catch (e) {
                        continue;
                    }
                }
                throw new Error('Dil seçici bulunamadı');
            });
        } catch (e) {
            console.log('Dil değiştirilemiyor, varsayılan dil kullanılacak');
        }

        await takeScreenshot(page, '07-form-completed');

        // 8. GENERATE/CONTINUE
        console.log('\nADIM 8: Video oluşturma başlatılıyor...');
        await retry(page, async () => {
            const actionButtons = [
                'button:has-text("Continue")',
                'button:has-text("Generate")',
                'button:has-text("Create")',
                'button:has-text("Start")',
                'button:has-text("Next")',
                'button:has-text("Proceed")',
                '[role="button"]:has-text("Continue")',
                '[role="button"]:has-text("Generate")',
                '.btn:has-text("Continue")',
                '.btn:has-text("Generate")'
            ];
            
            let buttonClicked = false;
            for (const buttonSelector of actionButtons) {
                try {
                    const button = page.locator(buttonSelector).first();
                    await button.waitFor({ state: 'visible', timeout: 8000 });
                    await button.click();
                    console.log(`Action button tıklandı: ${buttonSelector}`);
                    buttonClicked = true;
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            if (!buttonClicked) {
                throw new Error('Generate butonu bulunamadı');
            }
        });

        await takeScreenshot(page, '08-generation-started');
        
        // Success indicator bekle
        await page.waitForTimeout(5000);
        await takeScreenshot(page, '09-final-state');

        console.log('\n=== BAŞARILI ===');
        console.log('Video oluşturma süreci başlatıldı!');
        console.log('Hibrit otomasyon tamamlandı.');

    } catch (error) {
        console.error(`\nHATA: ${error.message}`);
        await takeScreenshot(page, 'error-final');
        
        const html = await page.content();
        fs.writeFileSync('error-page.html', html);
        console.log('Hata sayfası kaydedildi: error-page.html');
        
        throw error;
    } finally {
        // Cleanup
        try {
            if (fs.existsSync('./product-image.jpg')) {
                fs.unlinkSync('./product-image.jpg');
            }
        } catch (e) {}
        
        await browser.close();
        console.log('Browser kapatıldı.');
    }
}

createVideo().catch(error => {
    console.error('Ana hata:', error);
    process.exit(1);
});
