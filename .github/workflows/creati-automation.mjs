import { chromium } from 'playwright';
import https from 'https';
import fs from 'fs';

const email = process.env.EMAIL;
const password = process.env.PASSWORD;
const productDescription = process.env.DESCRIPTION;
const productImageUrl = process.env.IMAGE_URL;

console.log('Hybrid automation başlatılıyor...');
console.log('Manuel template seçimi sonrası devralıyor...');

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

async function continueFromUpload() {
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });
    
    try {
        // Manuel template seçimi sonrası upload sayfasından devralır
        console.log('1. Upload/Create sayfasına gidiliyor');
        await page.goto('https://www.creati.studio/create');
        await page.waitForTimeout(3000);
        await takeScreenshot(page, '01-upload-page');
        
        // Eğer login gerekiyorsa (session expire)
        const needsLogin = await page.$('input[type="email"]');
        if (needsLogin) {
            console.log('2. Session expire - tekrar login yapılıyor');
            await page.fill('input[type="email"]', email);
            await page.fill('input[type="password"]', password);
            
            const loginSelectors = [
                'button[type="submit"]',
                'button:has-text("Sign in")',
                'button:has-text("Log in")'
            ];
            
            for (const selector of loginSelectors) {
                try {
                    await page.click(selector);
                    console.log('Login yapıldı');
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            await page.waitForTimeout(5000);
            await takeScreenshot(page, '02-after-relogin');
        }
        
        console.log('3. Dosya upload işlemi');
        const tempImagePath = '/tmp/product_image.jpg';
        
        try {
            await downloadImage(productImageUrl, tempImagePath);
            console.log('Görsel indirildi');
            
            // Upload input'unu direkt ara
            const fileInputSelectors = [
                'input[type="file"]',
                'input[accept*="image"]',
                'input[accept*=".jpg"]',
                'input[accept*=".png"]'
            ];
            
            let uploaded = false;
            for (const selector of fileInputSelectors) {
                try {
                    const fileInput = await page.$(selector);
                    if (fileInput) {
                        await fileInput.setInputFiles(tempImagePath);
                        console.log(`Dosya upload edildi: ${selector}`);
                        uploaded = true;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            // File input bulunamazsa upload butonunu ara
            if (!uploaded) {
                const uploadButtonSelectors = [
                    'button:has-text("Upload")',
                    'button:has-text("Choose file")',
                    'button:has-text("Select image")',
                    'text=Upload product image',
                    'div:has-text("upload") button',
                    '[data-testid*="upload"]'
                ];
                
                for (const selector of uploadButtonSelectors) {
                    try {
                        await page.click(selector);
                        console.log(`Upload button tıklandı: ${selector}`);
                        await page.waitForTimeout(2000);
                        
                        const fileInput = await page.$('input[type="file"]');
                        if (fileInput) {
                            await fileInput.setInputFiles(tempImagePath);
                            console.log('File input üzerinden upload edildi');
                            uploaded = true;
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
            
        } catch (error) {
            console.error('Upload hatası:', error);
        }
        
        await page.waitForTimeout(3000);
        await takeScreenshot(page, '03-after-upload');
        
        console.log('4. Product description giriliyor');
        const scriptSelectors = [
            'textarea',
            'div[contenteditable="true"]',
            'input[placeholder*="description" i]',
            'input[placeholder*="script" i]',
            'textarea[placeholder*="text" i]',
            'div[role="textbox"]'
        ];
        
        let textEntered = false;
        for (const selector of scriptSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 3000 });
                await page.fill(selector, productDescription);
                console.log(`Description girildi: ${selector}`);
                textEntered = true;
                break;
            } catch (e) {
                continue;
            }
        }
        
        if (!textEntered) {
            console.log('Text input bulunamadı, devam ediliyor...');
        }
        
        await page.waitForTimeout(2000);
        await takeScreenshot(page, '04-after-text-input');
        
        console.log('5. Video generation başlatılıyor');
        const generateSelectors = [
            'button:has-text("Generate")',
            'button:has-text("Create video")',
            'button:has-text("Generate video")',
            'button:has-text("Continue")',
            'button:has-text("Create")',
            'button:has-text("Start")',
            '[data-testid*="generate"]',
            'button[type="submit"]'
        ];
        
        let generated = false;
        for (const selector of generateSelectors) {
            try {
                await page.click(selector);
                console.log(`Video generation başlatıldı: ${selector}`);
                generated = true;
                break;
            } catch (e) {
                continue;
            }
        }
        
        if (!generated) {
            console.log('Generate button bulunamadı');
            // Sayfadaki tüm butonları logla
            const buttons = await page.$$eval('button', 
                buttons => buttons.map(btn => btn.textContent?.trim()).filter(Boolean)
            );
            console.log('Sayfadaki butonlar:', buttons.slice(0, 10));
        }
        
        await page.waitForTimeout(3000);
        await takeScreenshot(page, '05-final-result');
        
        console.log('Hybrid automation tamamlandı');
        
    } catch (error) {
        console.error('Hata:', error);
        await takeScreenshot(page, '99-error');
        process.exit(1);
    } finally {
        await browser.close();
    }
}

await continueFromUpload();
