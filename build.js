const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

const htmlPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

html = html.replace('YOUR_API_KEY', process.env.VITE_FIREBASE_API_KEY || '');
html = html.replace(/YOUR_PROJECT_ID/g, process.env.VITE_FIREBASE_PROJECT_ID || '');
html = html.replace('YOUR_APP_ID', process.env.VITE_FIREBASE_APP_ID || '');

fs.writeFileSync(path.join(distDir, 'index.html'), html);

const filesToCopy = [
    'contact-us.html',
    'help-center.html', 
    'jamb-syllabus.html',
    'study-tips.html',
    'practice-mode-subjects.html',
    'exam-mode-subjects.html',
    'styles.css'
];

filesToCopy.forEach(file => {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(distDir, file);
    
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Copied ${file}`);
    }
});

console.log('✅ Build complete! Firebase credentials injected.');
console.log('📁 Output directory: dist/');
