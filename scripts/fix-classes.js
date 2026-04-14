/**
 * Fix class/className issues in Astro files
 * - HTML elements should use `class`
 * - React/Lucide components should use `className`
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const lucideIcons = [
  'User', 'Star', 'Check', 'CheckCircle', 'XCircle', 'InfoCircle', 'AlertCircle', 'HelpCircle',
  'MapPin', 'Camera', 'Clock', 'Phone', 'Globe', 'Mail', 'Settings', 'Bell', 'Heart', 'Trash',
  'Edit', 'Plus', 'Minus', 'X', 'Search', 'Arrow', 'Chevron', 'Menu', 'Home', 'Map', 'Calendar',
  'Tag', 'Share', 'Bookmark', 'Flag', 'Alert', 'Info', 'Warning', 'Loader', 'Refresh', 'Upload',
  'Download', 'Filter', 'More', 'Link', 'Copy', 'Eye', 'EyeOff', 'Lock', 'Unlock', 'Key', 'Shield',
  'Play', 'Pause', 'Stop', 'Skip', 'Rewind', 'FastForward', 'Volume', 'Mic', 'Video', 'Image',
  'File', 'Folder', 'Inbox', 'Send', 'Message', 'MessageSquare', 'Chat', 'Comment', 'Thumbs',
  'Grid3X3', 'List', 'ChefHat', 'Utensils', 'Flame', 'Award', 'ArrowLeft', 'ArrowRight'
];

const htmlElements = [
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button', 'input', 'textarea',
  'select', 'label', 'form', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
  'nav', 'header', 'footer', 'main', 'section', 'article', 'aside', 'img', 'svg', 'path',
  'circle', 'rect', 'line', 'polyline', 'polygon', 'i', 'em', 'strong', 'b', 'small'
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  // Fix 1: HTML elements should use class (not className)
  for (const el of htmlElements) {
    const regex = new RegExp(`<${el}\\s+className=`, 'g');
    content = content.replace(regex, `<${el} class=`);
  }

  // Fix 2: Lucide icons should use className (not class)
  for (const icon of lucideIcons) {
    const regex = new RegExp(`<${icon}\\s+class=`, 'g');
    content = content.replace(regex, `<${icon} className=`);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Fixed: ${filePath}`);
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
console.log(`\nTotal files fixed: ${fixedCount}`);
