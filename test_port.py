import paramiko
import os

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('202.10.40.147', username='root', password='eE#f4AtZaLH3$L')

stdin, stdout, stderr = client.exec_command('lsof -i :8000')
print("LSOF:")
print(stdout.read().decode())

stdin, stdout, stderr = client.exec_command('docker ps')
print("DOCKER PS:")
print(stdout.read().decode())

client.close()
