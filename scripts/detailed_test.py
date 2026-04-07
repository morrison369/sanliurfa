#!/usr/bin/env python3
import paramiko
import time

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def test_url(channel, url, name):
    channel.send(f'curl -s -o /dev/null -w "{name}: %{{http_code}}\n" {url}\n')
    time.sleep(2)

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, 
                timeout=20, look_for_keys=False, allow_agent=False)
    
    channel = ssh.invoke_shell()
    time.sleep(2)
    
    print("=== DETAYLI SITE TESTLERI ===\n")
    
    base = "http://127.0.0.1:4321"
    
    tests = [
        (f"{base}/", "Anasayfa"),
        (f"{base}/admin", "Admin"),
        (f"{base}/places", "Mekanlar"),
        (f"{base}/blog", "Blog"),
        (f"{base}/tarihi-yerler", "Tarihi Yerler"),
        (f"{base}/etkinlikler", "Etkinlikler"),
        (f"{base}/gastronomi", "Gastronomi"),
        (f"{base}/giris", "Giris"),
        (f"{base}/arama", "Arama"),
        (f"{base}/hakkinda", "Hakkimizda"),
        (f"{base}/api/health", "API Health"),
    ]
    
    for url, name in tests:
        test_url(channel, url, name)
    
    time.sleep(3)
    
    output = ""
    while channel.recv_ready():
        output += channel.recv(4096).decode('utf-8', errors='ignore')
        time.sleep(1)
    
    print("TEST SONUCLARI:")
    for line in output.split('\n')[-25:]:
        if ':' in line and ('HTTP' in line or '200' in line or '301' in line or '302' in line or '404' in line or '500' in line):
            print(line.strip()[:100])
    
    # Check PM2 status
    channel.send("source ~/.nvm/nvm.sh && pm2 list | grep sanliurfa\n")
    time.sleep(2)
    
    output2 = ""
    while channel.recv_ready():
        output2 += channel.recv(4096).decode('utf-8', errors='ignore')
        time.sleep(0.5)
    
    print("\nPM2 STATUS:")
    for line in output2.split('\n')[-5:]:
        if 'sanliurfa' in line:
            print(line.strip()[:150])
    
    channel.close()
    ssh.close()

if __name__ == "__main__":
    main()
