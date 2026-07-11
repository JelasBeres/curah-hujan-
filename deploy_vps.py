import paramiko
import tarfile
import os
import time

def make_tarfile(output_filename, source_dir):
    print(f"Compressing {source_dir} to {output_filename}...")
    with tarfile.open(output_filename, "w:gz") as tar:
        for root, dirs, files in os.walk(source_dir):
            if any(exclude in root for exclude in ['node_modules', 'venv', '.next', '.git', '__pycache__', '.pytest_cache']):
                continue
            for file in files:
                if file.endswith('.tar.gz'):
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                tar.add(file_path, arcname=arcname)
    print("Compression complete.")

def run_ssh_command(ssh, command):
    print(f"Running: {command}")
    stdin, stdout, stderr = ssh.exec_command(command)
    exit_status = stdout.channel.recv_exit_status()
    output = stdout.read().decode()
    err = stderr.read().decode()
    if output: print(output)
    if err: print(f"Error: {err}")
    return exit_status, output

def deploy():
    host = '202.10.40.147'
    username = 'root'
    password = 'eE#f4AtZaLH3$L'
    
    local_dir = os.path.dirname(os.path.abspath(__file__))
    tar_filename = os.path.join(local_dir, 'deploy.tar.gz')
    remote_dir = '/root/flood-early-warning'
    
    make_tarfile(tar_filename, local_dir)
    
    print("Connecting to VPS...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(hostname=host, username=username, password=password)
    
    print("Uploading file to VPS...")
    ftp = ssh.open_sftp()
    ftp.put(tar_filename, '/root/deploy.tar.gz')
    ftp.close()
    
    run_ssh_command(ssh, "apt-get update && apt-get install -y docker.io docker-compose")
    run_ssh_command(ssh, f"mkdir -p {remote_dir} && tar -xzf /root/deploy.tar.gz -C {remote_dir}")
    run_ssh_command(ssh, f"cd {remote_dir} && docker-compose down || true")
    run_ssh_command(ssh, f"cd {remote_dir} && docker-compose up -d --build")
    
    print("Cleaning up...")
    run_ssh_command(ssh, "rm /root/deploy.tar.gz")
    os.remove(tar_filename)
    
    ssh.close()
    print("Deployment to VPS successful!")

if __name__ == '__main__':
    deploy()
