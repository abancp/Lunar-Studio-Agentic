
import officeParser from 'officeparser';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Minimal test to check if officeparser is importable and runs
async function test() {
    console.log('Testing officeparser...');
    try {
        // We don't have a real PPTX handy to commit, so we'll just check if the function exists
        // and maybe handle an empty buffer gracefully or error out as expected.
        console.log('officeparse.parseOffice exists:', typeof officeParser.parseOffice);

        // Optional: Create a dummy file to see if it throws a specific error "not a valid office file"
        // This confirms the library is active.
        const dummyPath = path.join(os.tmpdir(), 'test_invalid.pptx');
        fs.writeFileSync(dummyPath, 'not a zip file');

        try {
            await officeParser.parseOffice(dummyPath);
        } catch (e: any) {
            console.log('Caught expected error for invalid file:', e.message);
        }

        if (fs.existsSync(dummyPath)) fs.unlinkSync(dummyPath);

        console.log('Test finished.');

    } catch (e) {
        console.error('Test failed:', e);
    }
}

test();
