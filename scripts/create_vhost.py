#!/usr/bin/env python3
import paramiko
import time

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, 
                timeout=20, look_for_keys=False, allow_agent=False)
    
    channel = ssh.invoke_shell()
    time.sleep(2)
    
    print("Creating Apache vhost for sanliurfa.com...")
    
    # Create vhost file line by line
    vhost_lines = [
        "<VirtualHost *:80>",
        "    ServerName sanliurfa.com",
        "    ServerAlias www.sanliurfa.com",
        "    DocumentRoot /home/sanliur/public_html",
        "    ",
        "    ProxyPreserveHost On",
        "    ProxyPass / http://127.0.0.1:4321/",
        "    ProxyPassReverse / http://127.0.0.1:4321/",
        "    ",
        "    RewriteEngine On",
        "    RewriteCond %{HTTP:Upgrade} websocket [NC]",
        "    RewriteCond %{HTTP:Connection} upgrade [NC]",
        '    RewriteRule ^/?(.*) "ws://127.0.0.1:4321/$1" [P,L]',
        "    ",
        "    <Directory /home/sanliur/public_html>",
        "        Options -Indexes +FollowSymLinks",
        "        AllowOverride All",
        "        Require all granted",
        "    </Directory>",
        "    ",
        "    ErrorLog /home/sanliur/public_html/logs/error.log",
        "    CustomLog /home/sanliur/public_html/logs/access.log combined",
        "</VirtualHost>",
    ]
    
    channel.send("mkdir -p /home/sanliur/.conf/apache\n")
    time.sleep(1)
    
    # Clear file first
    channel.send("> /home/sanliur/.conf/apache/sanliurfa.com.conf\n")
    time.sleep(1)
    
    for line in vhost_lines:
        escaped = line.replace('"', '\\"')
        channel.send(f'echo "{escaped}" >> /home/sanliur/.conf/apache/sanliurfa.com.conf\n')
        time.sleep(0.2)
    
    # Verify
    channel.send("cat /home/sanliur/.conf/apache/sanliurfa.com.conf\n")
    time.sleep(2)
    
    output = ""
    while channel.recv_ready():
        output += channel.recv(4096).decode('utf-8', errors='ignore')
        time.sleep(1)
    
    print("VHOST CONFIG:")
    print(output[-600:])
    
    # Check if Apache can reload
    channel.send("sudo /usr/local/apache/bin/apachectl configtest 2>&1\n")
    time.sleep(3)
    
    output2 = ""
    while channel.recv_ready():
        output2 += channel.recv(4096).decode('utf-8', errors='ignore')
        time.sleep(0.5)
    
    print("\nAPACHE TEST:")
    print(output2[-300:])
    
    channel.close()
    ssh.close()

if __name__ == "__main__":
    main()
