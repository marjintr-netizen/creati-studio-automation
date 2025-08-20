import { chromium } from 'playwright';
import https from 'https';
import fs from 'fs';

const email = process.env.EMAIL;
const password = process.env.PASSWORD;
const productDescription = process.env.DESCRIPTION;
const productImageUrl = process.env.IMAGE_URL;

console.log('Creati Studio automation başlatılıyor...');

async function takeScreenshot(page, name) {
    try {
        await page.screenshot({ path: `debug-${name}.png`, fullPage: true });
        console.log(`Screenshot alındı: debug-${name}.png`);
    } catch (error) {
        console.log(`Screenshot alınamadı: ${error.message}`);
    }
}

function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https.get(url, (response) => {
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
        headless: false, // DEBUG için false yap, sonra true yaparsın
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });
    
    try {
        // 1. LOGIN
        console.log('1. Creati Studio login sayfasına gidiliyor');
        await page.goto('https://www.creati.studio/');
        await page.waitForTimeout(3000);
        await takeScreenshot(page, '01-homepage');
        
        // Login butonuna tıkla
        try {
            await page.click('text=Go Create', { timeout: 5000 });
        } catch (e) {
            console.log('Go Create buton bulunamadı, direkt login sayfasına gidiliyor');
            await page.goto('https://www.creati.studio/login');
        }
        await page.waitForTimeout(3000);
        
        // Email ile devam et
        try {
            await page.click('text=Continue with email');
            await page.waitForTimeout(2000);
        } catch (e) {
            console.log('Continue with email bulunamadı');
        }
        
        // Login formunu doldur
        console.log('2. Email ve password giriliyor');
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);
        await takeScreenshot(page, '02-login-filled');
        
        // Login butonuna tıkla
        const loginButton = await page.$('button:has-text("LOG IN/SIGN UP")') || 
                           await page.$('button[type="submit"]');
        if (loginButton) {
            await loginButton.click();
            console.log('Login butonu tıklandı');
        }
        
        await page.waitForTimeout(8000);
        await takeScreenshot(page, '03-after-login');
        
        // 2. TEMPLATES SAYFASINA GİT
        console.log('3. Templates sayfasına gidiliyor');
        try {
            await page.click('text=Templates');
        } catch (e) {
            // Direkt URL'ye git
            await page.goto('https://www.creati.studio/templates');
        }
        await page.waitForTimeout(5000);
        await takeScreenshot(page, '04-templates-page');
        
        // 3. BAGS & ACCESSORIES KATEGORİSİNİ SEÇ
        console.log('4. Bags & Accessories kategorisi aranıyor');
        
        // Sayfayı scroll et
        await page.evaluate(() => window.scrollBy(0, 300));
        await page.waitForTimeout(2000);
        
        // Kategori başlığını bul
        const categoryFound = await page.locator('text="Bags & Accessories"').first();
        if (categoryFound) {
            console.log('Bags & Accessories kategorisi bulundu');
            await page.evaluate(() => window.scrollBy(0, 200));
            await page.waitForTimeout(2000);
        }
        
        await takeScreenshot(page, '05-category-found');
        
        // 4. COZY BEDROOM'U BUL VE TIKLA
        console.log('5. Cozy Bedroom template aranıyor');
        
        // Önce görseli bul
        const cozyBedroomSelectors = [
            // Text tabanlı
            'text="Cozy Bedroom"',
            'p:has-text("Cozy Bedroom")',
            'span:has-text("Cozy Bedroom")',
            
            // Parent container
            'div:has-text("Cozy Bedroom"):has(img)',
            'article:has-text("Cozy Bedroom")',
            
            // Image tabanlı
            'img[alt*="Cozy"]',
            'img[src*="cozy"]',
            
            // Data attribute
            '[data-label*="Cozy"]',
            '[data-name*="Cozy"]'
        ];
        
        let templateClicked = false;
        for (const selector of cozyBedroomSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    // Element'in görünür olduğundan emin ol
                    await element.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(1000);
                    await element.click();
                    console.log(`Cozy Bedroom tıklandı: ${selector}`);
                    templateClicked = true;
                    break;
                }
            } catch (e) {
                console.log(`Selector başarısız: ${selector}`);
                continue;
            }
        }
        
        // Eğer bulamazsa ilk template'i seç
        if (!templateClicked) {
            console.log('Cozy Bedroom bulunamadı, ilk template seçiliyor');
            const firstTemplate = await page.$('img').first();
            if (firstTemplate) {
                await firstTemplate.click();
                console.log('İlk template seçildi');
            }
        }
        
        await page.waitForTimeout(5000);
        await takeScreenshot(page, '06-template-selected');
        
        // 5. UPLOAD İŞLEMİ
        console.log('6. Ürün görseli upload ediliyor');
        
        // Upload butonunu bul
        const uploadButtonSelectors = [
            'button:has-text("Upload product image")',
            'button:has-text("Upload")',
            'text="Upload product image"',
            'div:has-text("Upload") button'
        ];
        
        for (const selector of uploadButtonSelectors) {
            try {
                await page.click(selector);
                console.log('Upload butonu tıklandı');
                await page.waitForTimeout(2000);
                break;
            } catch (e) {
                continue;
            }
        }
        
        // Dosyayı indir ve upload et
        const tempImagePath = '/tmp/product_image.jpg';
        await downloadImage(productImageUrl, tempImagePath);
        console.log('Görsel indirildi');
        
        // File input'u bul
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
            await fileInput.setInputFiles(tempImagePath);
            console.log('Dosya upload edildi');
            await page.waitForTimeout(3000);
        }
        
        await takeScreenshot(page, '07-after-upload');
        
        // 6. ÜRÜN AÇIKLAMASI GİR
        console.log('7. Ürün açıklaması giriliyor');
        
        // Text alanını bul
        const textSelectors = [
            'textarea[placeholder*="Type"]',
            'textarea[placeholder*="speech"]',
            'textarea[placeholder*="text"]',
            'textarea',
            'div[contenteditable="true"]',
            'input[type="text"][placeholder*="description"]'
        ];
        
        for (const selector of textSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    await element.click();
                    await element.fill(productDescription);
                    console.log('Açıklama girildi');
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        await page.waitForTimeout(2000);
        await takeScreenshot(page, '08-after-description');
        
        // 7. DİL SEÇİMİ (TÜRKÇE)
        console.log('8. Dil Türkçe yapılıyor');
        
        // Dil dropdown'ını bul
        try {
            // Dropdown'ı aç
            await page.click('select, [role="combobox"], button:has-text("English")');
            await page.waitForTimeout(1000);
            
            // Türkçe'yi seç
            await page.selectOption('select', { label: 'Turkish' });
            // veya
            await page.click('option:has-text("Turkish"), text="Turkish", text="Türkçe"');
        } catch (e) {
            console.log('Dil seçimi yapılamadı:', e.message);
        }
        
        await takeScreenshot(page, '09-after-language');
        
        // 8. CONTINUE/GENERATE
        console.log('9. Video generation başlatılıyor');
        
        const generateSelectors = [
            'button:has-text("Continue")',
            'button:has-text("Generate")',
            'button:has-text("Create")',
            'button:has-text("Generate video")',
            'button[type="submit"]:not(:disabled)'
        ];
        
        for (const selector of generateSelectors) {
            try {
                const button = await page.$(selector);
                if (button) {
                    const isDisabled = await button.evaluate(el => el.disabled);
                    if (!isDisabled) {
                        await button.click();
                        console.log('Generate butonu tıklandı');
                        break;
                    }
                }
            } catch (e) {
                continue;
            }
        }
        
        await page.waitForTimeout(5000);
        await takeScreenshot(page, '10-final');
        
        console.log('Video generation başlatıldı, işlem tamamlandı');
        
        // 10-15 saniye bekle
        await page.waitForTimeout(15000);
        
    } catch (error) {
        console.error('Hata oluştu:', error);
        await takeScreenshot(page, 'error-state');
        throw error;
    } finally {
        // Browser'ı kapatma (debug için)
        // await browser.close();
        console.log('Browser açık bırakıldı debug için');
        
        // Production'da kapat
        // await browser.close();
    }
}

await createVideo();
