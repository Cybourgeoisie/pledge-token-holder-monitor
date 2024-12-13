const fs = require('fs');
const path = require('path');

// Read all necessary files
const htmlContent = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
const cssContent = fs.readFileSync(path.join(__dirname, '../src/css/styles.css'), 'utf8');
const jsContent = fs.readFileSync(path.join(__dirname, '../src/js/main.js'), 'utf8');
const pledgesContent = fs.readFileSync(path.join(__dirname, '../src/data/pledges.json'), 'utf8');

// Replace the getPledgeData function with direct JSON content
const newGetPledgeData = `async function getPledgeData() {
  return ${pledgesContent};
}`;

// Replace the original getPledgeData function in the JS content
const modifiedJsContent = jsContent.replace(
  /async function getPledgeData\(\) {[\s\S]*?}/,
  newGetPledgeData
);

// Create the bundled content
let bundledContent = htmlContent;

// Replace the CSS link with actual CSS content
bundledContent = bundledContent.replace(
  '<link rel="stylesheet" href="css/styles.css">',
  `<style>\n${cssContent}\n</style>`
);

// Replace the JS script with actual JS content
bundledContent = bundledContent.replace(
  '<script src="js/main.js" type="module"></script>',
  `<script>\n${modifiedJsContent}\n</script>`
);

// Ensure dist directory exists
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Write the bundled content to dist/index.html
fs.writeFileSync(path.join(distDir, 'index.html'), bundledContent);

console.log('Successfully created bundled file at dist/index.html');