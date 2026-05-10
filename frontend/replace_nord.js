const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const indexHtml = path.join(__dirname, 'index.html');

function processFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Regex matches prefixes like bg-, text-, hover:bg-, dark:border-, placeholder-, etc.
    const regex = /([a-zA-Z0-9:-]+)-nord-(\d+)/g;
    
    const newContent = content.replace(regex, (match, prefix, numStr) => {
        const num = parseInt(numStr, 10);
        let replacementSuffix = '';
        
        switch (num) {
            case 0: replacementSuffix = 'background'; break;
            case 1: replacementSuffix = 'surface'; break;
            case 2:
            case 3:
                if (prefix.includes('text') || prefix.includes('placeholder')) {
                    replacementSuffix = 'muted';
                } else {
                    replacementSuffix = 'line';
                }
                break;
            case 4:
            case 5:
            case 6: replacementSuffix = 'foreground'; break;
            case 8:
            case 13: replacementSuffix = 'primary'; break;
            case 9: replacementSuffix = 'primary-hover'; break;
            case 11: replacementSuffix = 'danger'; break;
            case 12: replacementSuffix = 'warning'; break;
            case 14: replacementSuffix = 'success'; break;
            default: return match; // fallback
        }
        
        return `${prefix}-${replacementSuffix}`;
    });
    
    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`Updated ${filePath}`);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            processFile(fullPath);
        }
    }
}

walk(srcDir);
processFile(indexHtml);
