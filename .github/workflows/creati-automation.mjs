import { chromium } from 'playwright';
import https from 'https';
import fs from 'fs';

const email = process.env.EMAIL;
const password = process.env.PASSWORD;
const productDescription = process.env.DESCRIPTION;
const productImageUrl = process.env.IMAGE_URL;

console.log('Creati Studio automation başlatılıyor...');
console.log(`Email: ${email ? 'Mevcut' : 'Eksik'}`);
console.log(`Password: ${password ? 'Mevcut' : 'Eksik'}`);
console.log(`Description: ${productDescription ? productDescription.substring(0, 50) + '...' : 'Eksik'}`);
console.log(`Image URL: ${productImageUrl ? 'Mevcut' : 'Eksik'}`);

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

async function takeScreenshot(page, name) {
    try {
        await page.screenshot({ path: `debug-${name}.png`, fullPage: true });
        console.log(`📸 Screenshot alındı: debug-${name}.png`);
    } catch (error) {
        console.log(`❌ Screenshot alınamadı: ${error.message}`);
    }
}

async function waitForElementAndClick(page, selectors, description, timeout = 15000) {
    console.log(`🔍 ${description} aranıyor...`);
    
    for (const selector of selectors) {
        try {
            console.log(`  Deneniyor: ${selector}`);
            await page.waitForSelector(selector, { timeout: timeout });
            await page.click(selector);
            console.log(`✅ ${description} başarılı: ${selector}`);
            return true;
        } catch (error) {
            console.log(`  ❌ Başarısız: ${selector} - ${error.message}`);
            continue;
        }
    }
    
    console.error(`🚫 ${description} başarısız - hiçbir selector çalışmadı`);
    await takeScreenshot(page, description.replace(/\s+/g, '-'));
    return false;
}

async function fillInput(page, selectors, value, description) {
    console.log(`📝 ${description} dolduruluyor...`);
    
    for (const selector of selectors) {
        try {
            await page.waitForSelector(selector, { timeout: 5000 });
            await page.fill(selector, value);
            console.log(`✅ ${description} başarılı: ${selector}`);
            return true;
        } catch (error) {
            console.log(`  ❌ Başarısız: ${selector}`);
            continue;
        }
    }
    
    console.error(`🚫 ${description} başarısız`);
    return false;
}

async function createVideo() {
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Viewport ayarla
    await page.setViewportSize({ width: 1280, height: 720 });
    
    try {
        console.log('🚀 1. Creati Studio\'ya gidiliyor');
        await page.goto('https://www.creati.studio/', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        await takeScreenshot(page, '01-homepage');
        
        console.log('🎯 2. Go Create butonuna tıklanıyor');
        const goCreateSelectors = [
            'text="Go Create"',
            'text="Go create"',
            'a:has-text("Go Create")',
            'button:has-text("Go Create")',
            '[data-testid="go-create"]',
            'a[href*="create"]',
            'button[href*="create"]'
        ];
        
        if (!await waitForElementAndClick(page, goCreateSelectors, 'Go Create butonu')) {
            throw new Error('Go Create butonu bulunamadı');
        }
        
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, '02-after-go-create');
        
        console.log('📧 3. Continue with email seçiliyor');
        const emailLoginSelectors = [
            'text="Continue with email"',
            'text="Continue with Email"',
            'button:has-text("Continue with email")',
            'a:has-text("Continue with email")',
            '[data-testid="email-login"]',
            'button:has-text("Email")',
            'text="Sign in with email"'
        ];
        
        if (!await waitForElementAndClick(page, emailLoginSelectors, 'Continue with email')) {
            throw new Error('Continue with email bulunamadı');
        }
        
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, '03-login-form');
        
        console.log('🔐 4. Email ve password giriliyor');
        const emailSelectors = [
            'input[type="email"]',
            'input[name="email"]',
            'input[placeholder*="email" i]',
            'input[id*="email"]'
        ];
        
        const passwordSelectors = [
            'input[type="password"]',
            'input[name="password"]',
            'input[placeholder*="password" i]',
            'input[id*="password"]'
        ];
        
        if (!await fillInput(page, emailSelectors, email, 'Email')) {
            throw new Error('Email girilemedi');
        }
        
        if (!await fillInput(page, passwordSelectors, password, 'Password')) {
            throw new Error('Password girilemedi');
        }
        
        await takeScreenshot(page, '04-filled-form');
        
        console.log('🔑 5. Giriş yapılıyor');
        const submitSelectors = [
            'button[type="submit"]',
            'button:has-text("Sign in")',
            'button:has-text("Sign In")',
            'button:has-text("Log in")',
            'button:has-text("Login")',
            'input[type="submit"]',
            'button:has-text("Continue")'
        ];
        
        if (!await waitForElementAndClick(page, submitSelectors, 'Login butonu')) {
            throw new Error('Login butonu bulunamadı');
        }
        
        // Login sonrası daha uzun bekle
        console.log('⏳ Login işlemi için bekleniyor...');
        await page.waitForTimeout(8000);
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, '05-after-login');
        
        console.log('📑 6. Templates sayfasına gidiliyor');
        const templatesSelectors = [
            'text="Templates"',
            'a:has-text("Templates")',
            'button:has-text("Templates")',
            '[href*="templates"]',
            'nav a:has-text("Templates")'
        ];
        
        if (!await waitForElementAndClick(page, templatesSelectors, 'Templates')) {
            throw new Error('Templates bulunamadı');
        }
        
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, '06-templates-page');
        
        console.log('🛏️ 7. Cozy Bedroom şablonu seçiliyor');
        const bedroomSelectors = [
            'text="Cozy Bedroom"',
            '[alt*="Cozy Bedroom" i]',
            '[title*="Cozy Bedroom" i]',
            'div:has-text("Cozy Bedroom")',
            'h3:has-text("Cozy Bedroom")',
            'span:has-text("Cozy Bedroom")'
        ];
        
        if (!await waitForElementAndClick(page, bedroomSelectors, 'Cozy Bedroom template')) {
            // Alternatif: Sayfa üzerindeki tüm template'leri listele
            console.log('🔍 Mevcut template\'ler aranıyor...');
            const templates = await page.$$eval('[class*="template"], [data-testid*="template"], div:has(img)', 
                elements => elements.map(el => el.textContent || el.alt || el.title).filter(Boolean)
            );
            console.log('📋 Bulunan template\'ler:', templates);
            throw new Error('Cozy Bedroom template bulunamadı');
        }
        
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, '07-selected-template');
        
        console.log('🖼️ 8. Görsel upload işlemi');
        const tempImagePath = '/tmp/product_image.jpg';
        
        try {
            await downloadImage(productImageUrl, tempImagePath);
            console.log('✅ Görsel indirildi');
            
            // Önce file input ara
            let fileInput = await page.$('input[type="file"]');
            
            if (!fileInput) {
                // Upload butonunu bul ve tıkla
                const uploadButtonSelectors = [
                    'button:has-text("Upload")',
                    'text="Upload product image"',
                    'text="Upload image"',
                    '[data-testid="upload-button"]',
                    'button:has-text("Choose file")',
                    'div:has-text("upload") button',
                    'label[for*="file"]'
                ];
                
                await waitForElementAndClick(page, uploadButtonSelectors, 'Upload butonu');
                await page.waitForTimeout(2000);
                fileInput = await page.$('input[type="file"]');
            }
            
            if (fileInput) {
                await fileInput.setInputFiles(tempImagePath);
                console.log('✅ Dosya upload edildi');
                
                // Upload işleminin tamamlanmasını bekle
                await page.waitForTimeout(5000);
                
                // Upload edilen görsele çift tıkla
                const uploadedImageSelectors = [
                    'img[src*="blob:"]',
                    'img[src*="data:"]', 
                    '.uploaded-image',
                    '.preview-image',
                    '.image-preview img',
                    'img[alt*="upload" i]',
                    'img[class*="uploaded"]'
                ];
                
                let imageClicked = false;
                for (const selector of uploadedImageSelectors) {
                    try {
                        const uploadedImage = await page.$(selector);
                        if (uploadedImage) {
                            await uploadedImage.dblclick();
                            console.log(`✅ Görsele çift tıklandı: ${selector}`);
                            imageClicked = true;
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
                
                if (!imageClicked) {
                    console.log('⚠️ Upload edilmiş görsel bulunamadı, devam ediliyor...');
                }
            } else {
                console.error('🚫 File input bulunamadı');
            }
            
        } catch (error) {
            console.error('❌ Upload hatası:', error);
        }
        
        await takeScreenshot(page, '08-after-upload');
        
        console.log('📝 9. Script alanı dolduruluyor');
        const scriptSelectors = [
            'textarea',
            'div[contenteditable="true"]',
            'input[placeholder*="script" i]',
            'textarea[placeholder*="description" i]',
            'div[role="textbox"]',
            'input[name*="script"]'
        ];
        
        if (!await fillInput(page, scriptSelectors, productDescription, 'Product description')) {
            console.warn('⚠️ Script girme başarısız, devam ediliyor...');
        }
        
        await takeScreenshot(page, '09-after-script');
        
        console.log('🎬 10. Video oluşturma başlatılıyor');
        const generateSelectors = [
            'button:has-text("Generate")',
            'button:has-text("Create video")',
            'button:has-text("Continue")',
            'button:has-text("Create")',
            'button:has-text("Generate video")',
            'button:has-text("Start generation")',
            '[data-testid="generate"]',
            'button[type="submit"]'
        ];
        
        if (!await waitForElementAndClick(page, generateSelectors, 'Video generate butonu')) {
            // Son çare olarak tüm butonları listele
            console.log('🔍 Sayfadaki tüm butonlar aranıyor...');
            const buttons = await page.$$eval('button', 
                buttons => buttons.map(btn => btn.textContent?.trim()).filter(Boolean)
            );
            console.log('📋 Bulunan butonlar:', buttons);
            throw new Error('Generate butonu bulunamadı');
        }
        
        console.log('✅ Video oluşturma işlemi başlatıldı');
        await page.waitForTimeout(5000);
        await takeScreenshot(page, '10-video-generation-started');
        
        console.log('🎉 İşlem tamamlandı');
        
    } catch (error) {
        console.error('❌ Ana hata:', error);
        await takeScreenshot(page, '99-error');
        
        // Hata durumunda sayfa içeriğini de logla
        try {
            const pageContent = await page.content();
            console.log('📄 Sayfa içeriği (ilk 1000 karakter):', pageContent.substring(0, 1000));
        } catch (e) {
            console.log('Sayfa içeriği alınamadı');
        }
        
        process.exit(1);
    } finally {
        await browser.close();
    }
}

await createVideo();
