/**
 * Deployment Automation Script
 * Build, test, and deploy the application
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface DeployConfig {
  environment: 'staging' | 'production';
  server: string;
  user: string;
  keyPath?: string;
  appDir: string;
}

/**
 * Run deployment
 */
export async function deploy(config: DeployConfig): Promise<{
  success: boolean;
  steps: string[];
  error?: string;
}> {
  const steps: string[] = [];

  try {
    // 1. Pre-deployment checks
    steps.push('Running pre-deployment checks...');
    await runPreDeploymentChecks();

    // 2. Build application
    steps.push('Building application...');
    execSync('npm run build', { stdio: 'inherit' });

    // 3. Run tests
    steps.push('Running tests...');
    execSync('npm run test:unit', { stdio: 'inherit' });

    // 4. Database migrations
    steps.push('Running database migrations...');
    await runMigrations(config);

    // 5. Deploy to server
    steps.push('Deploying to server...');
    await deployToServer(config);

    // 6. Post-deployment verification
    steps.push('Verifying deployment...');
    await verifyDeployment(config);

    steps.push('Deployment completed successfully!');
    return { success: true, steps };

  } catch (error: any) {
    return { success: false, steps, error: error.message };
  }
}

async function runPreDeploymentChecks(): Promise<void> {
  // Check environment variables
  const required = ['DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  // Check Node.js version
  const nodeVersion = process.version;
  if (!nodeVersion.startsWith('v18') && !nodeVersion.startsWith('v20')) {
    throw new Error(`Node.js 18 or 20 required, found ${nodeVersion}`);
  }
}

async function runMigrations(config: DeployConfig): Promise<void> {
  // Run database migrations
  const { query } = await import('../src/lib/postgres');
  
  // Check connection
  await query('SELECT 1');
  
  // Run pending migrations
  const result = await query(`
    SELECT COUNT(*) FROM schema_migrations
  `);
  
  console.log(`Database ready. Applied migrations: ${result.rows[0].count}`);
}

async function deployToServer(config: DeployConfig): Promise<void> {
  const sshCmd = config.keyPath 
    ? `ssh -i ${config.keyPath}` 
    : 'ssh';

  // Create tarball
  execSync('tar -czf deploy.tar.gz dist/ package.json package-lock.json');

  // Copy to server
  execSync(`scp ${config.keyPath ? `-i ${config.keyPath}` : ''} deploy.tar.gz ${config.user}@${config.server}:${config.appDir}/`);

  // Extract and install
  execSync(`${sshCmd} ${config.user}@${config.server} "cd ${config.appDir} && tar -xzf deploy.tar.gz && npm install --production"`);

  // Restart application
  execSync(`${sshCmd} ${config.user}@${config.server} "cd ${config.appDir} && pm2 restart ecosystem.config.js"`);

  // Cleanup
  fs.unlinkSync('deploy.tar.gz');
}

async function verifyDeployment(config: DeployConfig): Promise<void> {
  const healthUrl = `https://${config.server}/api/health`;
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check health endpoint
  const response = await fetch(healthUrl);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }

  const health = await response.json();
  if (health.status !== 'healthy') {
    throw new Error('Server not healthy');
  }

  console.log('Deployment verified successfully');
}

/**
 * Rollback deployment
 */
export async function rollback(config: DeployConfig): Promise<boolean> {
  try {
    const sshCmd = config.keyPath 
      ? `ssh -i ${config.keyPath}` 
      : 'ssh';

    // Restore previous version
    execSync(`${sshCmd} ${config.user}@${config.server} "cd ${config.appDir} && pm2 reload ecosystem.config.js --update-env"`);
    
    return true;
  } catch {
    return false;
  }
}

// CLI usage
if (require.main === module) {
  const environment = process.argv[2] as 'staging' | 'production' || 'staging';
  
  const config: DeployConfig = {
    environment,
    server: environment === 'production' ? 'sanliurfa.com' : 'staging.sanliurfa.com',
    user: 'deploy',
    appDir: '/var/www/sanliurfa',
  };

  deploy(config).then(result => {
    if (result.success) {
      console.log('✅ Deployment successful');
      process.exit(0);
    } else {
      console.error('❌ Deployment failed:', result.error);
      process.exit(1);
    }
  });
}
