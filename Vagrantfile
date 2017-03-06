# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "mwrock/Windows2012R2"

  config.vm.provider "virtualbox" do |vb|
    vb.gui = true
    vb.cpus = 2
    vb.memory = "4096"
  end

  config.vm.provision "shell", inline: <<-SHELL
    choco install git golang gitkraken -y
    [Environment]::SetEnvironmentVariable("PATH", "$env:USERPROFILE\\go\\bin;$env:PATH", "User")
    (New-Object System.Net.WebClient).DownloadFile('https://atom.io/download/windows_x64?channel=beta', 'C:\Windows\Temp\atom.exe')" <NUL
    C:\Windows\Temp\atom.exe /quiet
    apm develop go-plus
    cd "$env:USERPROFILE\\github\\go-plus"
  SHELL
end
