import { Client } from 'ssh2';

export function buildRemotePrefix(remoteDir) {
  return `cd ${remoteDir} && export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && `;
}

export function runRemoteCommand(connection, command, { passthrough = true } = {}) {
  return new Promise((resolve, reject) => {
    connection.exec(command, (error, stream) => {
      if (error) {
        reject(error);
        return;
      }
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => resolve({ code, stdout, stderr }));
      stream.on('data', (chunk) => {
        const text = chunk.toString();
        stdout += text;
        if (passthrough) process.stdout.write(text);
      });
      stream.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderr += text;
        if (passthrough) process.stderr.write(text);
      });
    });
  });
}

export async function withSshConnection(sshConfig, task) {
  const connection = new Client();
  await new Promise((resolve, reject) => {
    connection.on('ready', resolve).on('error', reject).connect(sshConfig);
  });
  try {
    return await task(connection);
  } finally {
    connection.end();
  }
}

export async function restartRemotePm2AndCheck({
  sshConfig,
  remoteDir,
  pm2Name,
  healthUrl = 'http://127.0.0.1:4321/api/health',
  healthMode = 'http-code',
  restartFallback = false,
  settleMs = 8000,
}) {
  return withSshConnection(sshConfig, async (connection) => {
    const remotePrefix = buildRemotePrefix(remoteDir);
    const restartCommand = restartFallback
      ? `${remotePrefix}(pm2 restart ${pm2Name} 2>&1 || pm2 restart all 2>&1)`
      : `${remotePrefix}pm2 restart ${pm2Name}`;

    const restartResult = await runRemoteCommand(connection, restartCommand);
    if (restartResult.code !== 0) {
      throw new Error(`PM2 restart başarısız (exit ${restartResult.code})`);
    }

    await new Promise((resolve) => setTimeout(resolve, settleMs));

    const healthCommand =
      healthMode === 'json-status'
        ? `curl -sf ${healthUrl} | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','ok'))" 2>/dev/null || echo ok`
        : `curl -s --max-time 15 -o /dev/null -w "%{http_code}" ${healthUrl}`;

    const healthResult = await runRemoteCommand(connection, healthCommand, { passthrough: false });
    return {
      restartOutput: restartResult.stdout.trim(),
      healthOutput: healthResult.stdout.trim(),
    };
  });
}
