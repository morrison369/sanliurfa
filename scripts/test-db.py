#!/usr/bin/env python3
"""Test DB connection directly on server"""
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD', timeout=30)

# Test different passwords — set actual passwords on server, not in code
passwords = ['CHANGE_ME_DB_PASSWORD', 'Dxrmxc5B6SbP', 'sanliur', 'postgres']
users = ['sanliur_sanliurfa', 'sanliurfa_user', 'sanliurfa', 'postgres']

for user in users:
    for pwd in passwords:
        _, out, err = ssh.exec_command(
            f'PGPASSWORD={pwd} psql -h localhost -U {user} -d {user} -c "SELECT 1" 2>&1',
            timeout=10
        )
        time.sleep(2)
        o = out.read().decode()
        e = err.read().decode()
        if '1' in o:
            print(f'OK: user={user} pwd={pwd}')
        elif 'failed' in (o+e).lower():
            pass  # wrong password

print('DB test done.', flush=True)

# Also list available DB users
_, out, _ = ssh.exec_command('sudo -u postgres psql -c "\\du" 2>/dev/null || psql -U postgres -c "\\du" 2>/dev/null || echo NO_PSQL_ACCESS')
time.sleep(3)
print(out.read().decode()[-500:], flush=True)

ssh.close()
