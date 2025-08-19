import { chromium } from 'playwright';
import https from 'https';
import fs from 'fs';

// Environment variables'dan verileri al
const email = process.env.EMAIL;
const password = process.env.PASSWORD;
const productDescription = process.env.DESCRIPTION;
const productImageUrl = process.env.IMAGE_URL;

console.log('Creati Studio automation başlatılıyor...');

// Screenshot fonksiyonu
async function takeScreenshot(page, name) {
    try {
        await page.screenshot({ path: `debug-${name}.png`, fullPage: true });
        console.log(`📸 Screenshot alındı: debug-${name}.png`);
    } catch (error) {
        console.log(`❌ Screenshot alınamadı: ${error.message}`);
    }
}

// URL'den dosya indirme fonksiyonu
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
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('1. Creati Studio\'ya gidiliyor');
        await page.goto('https://www.creati.studio/');
        await page.waitForTimeout(3000);
        await takeScreenshot(page, '01-homepage');
        
        console.log('2. Go Create butonuna tıklanıyor');
        await page.click('text=Go Create');
        await page.waitForTimeout(3000);
        await takeScreenshot(page, '02-after-go-create');
        
        console.log('3. Continue with email seçiliyor');
        await page.click('text=Continue with email');
        await page.waitForTimeout(3000);
        await takeScreenshot(page, '03-login-form');
        
        console.log('4. Email ve password giriliyor');
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);
        await takeScreenshot(page, '04-filled-form');
        
        const submitSelectors = [
            'button[type="submit"]',
            'button:has-text("Sign in")',
            'button:has-text("Log in")'
        ];
        
        for (const selector of submitSelectors) {
            try {
                await page.click(selector, { timeout: 5000 });
                console.log('Giriş yapıldı');
                break;
            } catch (e) {
                continue;
            }
        }
        
        await page.waitForTimeout(8000);
        await takeScreenshot(page, '05-after-login');
        
        console.log('5. Templates sayfasına gidiliyor');
        await page.click('text=Templates');
        await page.waitForTimeout(3000);
        await takeScreenshot(page, '06-templates-page');
        
        console.log('6. Cozy Bedroom şablonu seçiliyor');
        await page.click('text=Cozy Bedroom');
        await page.waitForTimeout(5000);
        await takeScreenshot(page, '07-selected-template');
        
        console.log('7. Görsel upload işlemi');
        const tempImagePath = '/tmp/product_image.jpg';
        
        try {
            await downloadImage(productImageUrl, tempImagePath);
            console.log('Görsel indirildi');
            
            const uploadSelectors = [
                'button:has-text("Upload product image")',
                'text=Upload product image',
                'button:has-text("Upload")'
            ];
            
            for (const selector of uploadSelectors) {
                try {
                    await page.click(selector, { timeout: 3000 });
                    console.log('Upload butonu bulundu');
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            await page.waitForTimeout(2000);
            
            const fileInput = await page.$('input[type="file"]');
            if (fileInput) {
                await fileInput.setInputFiles(tempImagePath);
                console.log('Dosya upload edildi');
                
                // Upload edilen görsele çift tıkla
                await page.waitForTimeout(3000);
                const uploadedImageSelectors = [
                    'img[src*="blob:"]',
                    'img[src*="data:"]', 
                    '.uploaded-image',
                    '.preview-image',
                    '.image-preview img',
                    'img[alt*="upload"]'
                ];
                
                let imageClicked = false;
                for (const selector of uploadedImageSelectors) {
                    try {
                        const uploadedImage = await page.$(selector);
                        if (uploadedImage) {
                            await uploadedImage.dblclick();
                            console.log(`Görsele çift tıklandı: ${selector}`);
                            imageClicked = true;
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
                
                if (!imageClicked) {
                    console.log('Upload edilmiş görsel bulunamadı');
                }
            }
            
        } catch (error) {
            console.error('Upload hatası:', error);
        }
        
        await page.waitForTimeout(3000);
        await takeScreenshot(page, '08-after-upload');
        
        console.log('8. Script alanı dolduruluyor');
        const scriptSelectors = [
            'textarea',
            'div[contenteditable="true"]'
        ];
        
        for (const selector of scriptSelectors) {
            try {
                await page.fill(selector, productDescription);
                console.log('Script girildi');
                break;
            } catch (e) {
                continue;
            }
        }
        
        await page.waitForTimeout(2000);
        await takeScreenshot(page, '09-after-script');
        
        console.log('9. Video oluşturma başlatılıyor');
        const continueSelectors = [
            'button:has-text("Continue")',
            'button:has-text("Generate")',
            'button:has-text("Create video")',
            'button:has-text("Generate video")',
            'button:has-text("Start generation")'
        ];
        
        for (const selector of continueSelectors) {
            try {
                await page.click(selector, { timeout: 5000 });
                console.log(`Video oluşturma başlatıldı: ${selector}`);
                break;
            } catch (e) {
                continue;
            }
        }
        
        await takeScreenshot(page, '10-video-generation-started');
        console.log('İşlem tamamlandı');
        
    } catch (error) {
        console.error('Hata:', error);
        await takeScreenshot(page, '99-error');
        process.exit(1);
    } finally {
        await browser.close();
    }
}

await createVideo();
