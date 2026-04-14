/**
 * Documentation Generator
 * Auto-generate API docs and README
 */

import * as fs from 'fs';
import * as path from 'path';

interface ModuleDoc {
  name: string;
  description: string;
  exports: ExportDoc[];
}

interface ExportDoc {
  name: string;
  type: 'function' | 'interface' | 'const';
  signature?: string;
  description?: string;
}

/**
 * Generate API documentation from source
 */
export function generateAPIDocs(srcDir: string): string {
  const modules: ModuleDoc[] = [];
  
  // Read all module directories
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const indexPath = path.join(srcDir, entry.name, 'index.ts');
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf-8');
        modules.push(parseModule(entry.name, content));
      }
    }
  }

  // Generate markdown
  let markdown = '# API Documentation\n\n';
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  markdown += '## Modules\n\n';

  for (const module of modules) {
    markdown += `### ${module.name}\n\n`;
    markdown += `${module.description}\n\n`;
    
    if (module.exports.length > 0) {
      markdown += '#### Exports\n\n';
      for (const exp of module.exports) {
        markdown += `- **${exp.name}** (${exp.type})\n`;
        if (exp.signature) {
          markdown += `  \`\`\`typescript\n  ${exp.signature}\n  \`\`\`\n`;
        }
        if (exp.description) {
          markdown += `  ${exp.description}\n`;
        }
      }
      markdown += '\n';
    }
  }

  return markdown;
}

function parseModule(name: string, content: string): ModuleDoc {
  const lines = content.split('\n');
  let description = '';
  const exports: ExportDoc[] = [];

  // Extract module description from first comment
  if (lines[0].startsWith('/**')) {
    let i = 1;
    while (i < lines.length && !lines[i].includes('*/')) {
      description += lines[i].replace(/\s*\*\s*/, ' ').trim();
      i++;
    }
  }

  // Extract exports
  const exportRegex = /export\s+(async\s+)?function\s+(\w+)/g;
  const interfaceRegex = /export\s+interface\s+(\w+)/g;
  
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push({
      name: match[2],
      type: 'function',
    });
  }
  
  while ((match = interfaceRegex.exec(content)) !== null) {
    exports.push({
      name: match[1],
      type: 'interface',
    });
  }

  return { name, description, exports };
}

/**
 * Generate README with project stats
 */
export function generateREADME(projectDir: string): string {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8')
  );

  let readme = `# ${packageJson.name}\n\n`;
  readme += `${packageJson.description}\n\n`;
  readme += `## Installation\n\n`;
  readme += '\`\`\`bash\n';
  readme += 'npm install\n';
  readme += '\`\`\`\n\n';
  readme += `## Development\n\n`;
  readme += '\`\`\`bash\n';
  readme += 'npm run dev\n';
  readme += '\`\`\`\n\n';
  readme += `## Build\n\n`;
  readme += '\`\`\`bash\n';
  readme += 'npm run build\n';
  readme += '\`\`\`\n\n';
  readme += `## Test\n\n`;
  readme += '\`\`\`bash\n';
  readme += 'npm test\n';
  readme += '\`\`\`\n\n';
  readme += `## Project Stats\n\n`;
  readme += `- **Version**: ${packageJson.version}\n`;
  readme += `- **Node**: ${packageJson.engines?.node || '18.x'}\n`;
  readme += `- **License**: ${packageJson.license || 'MIT'}\n`;

  return readme;
}

// Run if called directly
if (require.main === module) {
  const srcDir = path.join(__dirname, '..', 'src', 'lib');
  const docs = generateAPIDocs(srcDir);
  
  fs.writeFileSync(
    path.join(__dirname, '..', 'API.md'),
    docs
  );
  
  console.log('Documentation generated: API.md');
}
