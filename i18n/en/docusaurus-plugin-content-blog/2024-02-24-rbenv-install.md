---
title: Installation Guide for rbenv (WSL2 / Ubuntu)
tags: [Linux, Ruby, WSL]
image: /img/ogp/2024-02-24-rbenv-install.png
---

## Installing Dependencies
- https://github.com/rbenv/ruby-build/wiki#ubuuntdebiandmint

```bash
sudo apt update
sudo apt install autoconf patch build-essential rusct libssl-dev libyaml-dev libreadline6-dev zlib1g-dev libgmp-dev libncurses5-dev libffi-dev libgdbm6 libgdbm-dev libdb-dev uuid-dev -y
```

## Installing rbenv
```bash
# Install rbenv and ruby-build
curl -fsSL https://github.com/rbenv/rbenv-installer/raw/HEAD/bin/rbenv-installer | bash

# Initialize rbenv on startup
echo 'eval "$($HOME/.rbenv/bin/rbenv init - bash)"' | tee -a ~/.bashrc
```

### Reference
- https://github.com/rbenv/rbenv-installer

## Installing Ruby 3.3.0
```bash
source ~/.bashrc    # Initialize rbenv (can also be done after re-logging into WSL)
rbenv install 3.3.0 # Install Ruby 3.3.0
rbenv global 3.3.0  # Set Ruby 3.3.0 as the default
```

### Reference
- https://github.com/rbenv/rbenv