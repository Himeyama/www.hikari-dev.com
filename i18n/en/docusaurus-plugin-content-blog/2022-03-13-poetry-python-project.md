---
title: Creating a Python Project with Poetry
layout: post
authors: hikari
---

## Environment Setup
If Python and Poetry are already installed, [skip](#python-project-creation)

### pyenv and Python Installation
**Skip [Poetry installation](#python-project-creation) if already installed**

Reference: https://github.com/pyenv/pyenv-installer

```bash
# Install dependencies
sudo apt update
sudo apt install make build-essential libssl-dev zlib1g-dev \
libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm \
libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev libffi-dev liblemma-dev

curl https://pyenv.run | bash
```

Add to `~/ .bashrc`
```bash title='.bashrc'
export PATH=$PATH:~/.pyenv/bin
eval "$(pyenv init --path)"
eval "$(pyenv virtualenv-init -)"
```

Next, install Python.

```bash
# Display a list of available versions
pyenv install -l
# Install Python 3.10.2
pyenv install 3.10.2

# Set the version
pyenv global 3.10.2
# Verify the version
pyenv versions
```

### Poetry Installation
**Skip [Python project creation](#python-project-creation) if already installed**

```sh
pip install --upgrade pip
pip install poetry
```

## Creating a Python Project
### Create a Template
Create a Python project named `myapp`.

```bash
poetry new myapp
```

The project configuration is described in `pyproject.toml`.

- ./
   - README.rst
   - myapp/ (where the Python code is located)
       - \_ \_init__.py
   - pyproject.toml (project configuration file)
   - tests/ (where the test code is located)
       - \_ \_init__.py
       - test_myapp.py

When you import `myapp` in `./`, `myapp/ \_ \_init__.py` is loaded.

### Add Reusable Python Code to the Project
> Example: Create `hoge.py` under `myapp/`.

```diff
.
├── README.rst
├── myapp
│   ├── \_ \_init__.py
│   └── hoge.py
├── pyproject.toml
└── tests
    ├── \_ \_init__.py
    └── test_myapp.py

2 directories, 6 files
```

When you import `from myapp import hoge` in `./`, `hoge.py` is loaded.

> Example: Using functions from `hoge.py`
```py title='myapp/hoge.py'
def hello():
   print('Hello, world!')
```

Executing the following in `./` will make `hello()` callable. The same applies to classes.
```py
>>> from myapp.hoge import hello
>>> hello()
Hello, world!
```

### Adding Packages
If you need dependency packages, run `poetry add`.
To remove, use `poetry remove`.
> Example: Add numpy
```bash
poetry add numpy
```

### Creating a Package
Create the `myapp` package.
This makes the project installable and usable as a library.

```bash
poetry build
```

A wheel and tarball are created under `dist/`.

The created package can be installed with the pip command.

```bash
pip install dist/myapp-0.1.0.tar.gz
```

### Distributing the Project as a Package
(To be added later)
[EOL]