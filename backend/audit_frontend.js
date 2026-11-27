import fs from 'fs';
import path from 'path';

const fDir = 'C:/Users/sukendra kumar/Downloads/lostandfound/frontend/src';

function walk(d) {
    let res = [];
    for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) res = res.concat(walk(p));
        else res.push(p);
    }
    return res;
}

const all = walk(fDir);

// Catalog by type
const pages = all.filter(f => f.includes('/pages/'));
const components = all.filter(f => f.includes('/components/'));
const cssFiles = all.filter(f => f.endsWith('.css'));
const jsFiles = all.filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

console.log('\n=== PAGES ===');
pages.forEach(p => console.log(' ', p.replace(fDir, '')));

console.log('\n=== COMPONENTS ===');
components.forEach(p => console.log(' ', p.replace(fDir, '')));

console.log('\n=== CSS FILES ===');
cssFiles.forEach(p => console.log(' ', p.replace(fDir, '')));

console.log('\n=== OTHER JS/JSX ===');
jsFiles.filter(f => !pages.includes(f) && !components.includes(f) && !cssFiles.includes(f))
    .forEach(p => console.log(' ', p.replace(fDir, '')));

// Scan for responsive patterns
console.log('\n=== CSS RESPONSIVE ANALYSIS ===');
for (const cssFile of cssFiles) {
    const content = fs.readFileSync(cssFile, 'utf8');
    const mediaMatches = content.match(/@media[^{]+\{/g) || [];
    const fixedWidths = content.match(/width:\s*\d{3,4}px/g) || [];
    const fixedHeights = content.match(/height:\s*\d{3,4}px/g) || [];
    console.log(`\n${cssFile.replace(fDir, '')}:`);
    console.log(`  media queries: ${mediaMatches.length}`);
    if (mediaMatches.length > 0) console.log('  queries:', mediaMatches.slice(0, 8));
    if (fixedWidths.length > 0) console.log('  fixed widths (first 5):', fixedWidths.slice(0, 5));
    if (fixedHeights.length > 0) console.log('  fixed heights (first 5):', fixedHeights.slice(0, 5));
}
