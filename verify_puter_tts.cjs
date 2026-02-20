const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        executablePath: '/usr/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    console.log('Navigating to empty page...');
    await page.goto('https://www.google.com');

    console.log('Injecting Puter.js...');
    await page.addScriptTag({ url: 'https://js.puter.com/v2/' });

    console.log('Waiting for puter object...');
    try {
        await page.waitForFunction('window.puter !== undefined', { timeout: 10000 });
    } catch (e) {
        console.error('Timed out waiting for puter object');
        await browser.close();
        return;
    }

    console.log('Calling txt2speech...');
    const result = await page.evaluate(async () => {
        try {
            const audio = await window.puter.ai.txt2speech("Hello world");
            // Check what audio is. 
            // If it's an Audio object, it has src.
            // If it's a blob, we can reads it.
            // Let's return the type and properties.
            let type = typeof audio;
            let props = {};
            if (audio instanceof HTMLAudioElement) {
                type = 'HTMLAudioElement';
                props = { src: audio.src };
            } else if (audio instanceof Blob) {
                type = 'Blob';
                props = { size: audio.size, type: audio.type };
            } else if (typeof audio === 'object') {
                props = Object.keys(audio);
            }
            return { type, props, data: typeof audio === 'string' ? audio : 'object' };
        } catch (e) {
            return { error: e.toString() };
        }
    });

    console.log('txt2speech Result:', result);

    await browser.close();
})();
