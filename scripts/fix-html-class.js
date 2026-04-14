/**
 * Fix HTML elements using className instead of class in .astro files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HTML elements that should use `class` not `className`
const htmlElements = [
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button', 'input',
  'textarea', 'select', 'label', 'form', 'ul', 'ol', 'li', 'table', 'tr', 'td',
  'th', 'thead', 'tbody', 'nav', 'header', 'footer', 'main', 'section', 'article',
  'aside', 'img', 'i', 'em', 'strong', 'b', 'small', 'br', 'hr'
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  // Fix HTML elements using className -> class
  for (const el of htmlElements) {
    // Match <element className="..."
    const regex = new RegExp(`<${el}\\b([^>]*)className=`, 'g');
    content = content.replace(regex, `<${el}$1class=`);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Fixed HTML: ${path.basename(filePath)}`);
    return true;
  }
  return false;
}

function walkDir(dir) {
  let count = 0;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('dist')) {
      count += walkDir(fullPath);
    } else if (file.endsWith('.astro')) {
      if (fixFile(fullPath)) {
        count++;
      }
    }
  }

  return count;
}

const srcDir = path.join(__dirname, '..', 'src');
const fixedCount = walkDir(srcDir);
console.log(`\nTotal HTML files fixed: ${fixedCount}`);
