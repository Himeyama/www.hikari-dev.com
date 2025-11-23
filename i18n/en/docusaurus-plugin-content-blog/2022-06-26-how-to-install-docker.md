---
title: Installing Docker on Ubuntu
tags: [Ubuntu, Linux, Docker, Japanese translation]
authors: hikari
---

This is a translation of the Docker installation guide for Ubuntu.

[EOL]

1.  **Installing Docker Engine**

    *   **Using Package Manager:** This is the recommended method for most users.

        ```bash
        sudo apt-get update
        sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin
        ```

    *   **Using the Convenient Script:** Docker provides a convenient script for quickly and non-interactively installing Docker in development environments. While not recommended for production, it can be useful for creating provisioning scripts tailored to your needs. Refer to the [install using package repository](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository) instructions for installation steps using the repository. The script's source code is open source and available on the [GitHub docker-install repository](https://github.com/docker/docker-install). Always review downloaded scripts before executing them.

        ```bash
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        ```

    *   **Using Pre-release:** Docker also provides a convenient script to install pre-releases of Docker on Linux, available at [test.docker.com](https://test.docker.com/). This script configures the package manager to enable the "test" channel from which you can access early versions of new releases and test them in a non-production environment before they are released as stable.

        ```bash
        curl -fsSL https://test.docker.com -o test-docker.sh
        sudo sh test-docker.sh
        ```

    *   **Important:** Before running the script, it's a good practice to preview the steps the script will execute by using the `DRY_RUN=1` option.

        ```bash
        curl -fsSL https://get.docker.com -o get-docker.sh
        DRY_RUN=1 sh ./get-docker.sh
        ```

2.  **Post-Installation Steps**

    *   **Non-root User Access:** By default, users other than root cannot run Docker commands. To allow non-root users to run Docker, refer to the [post-installation steps for Linux](https://docs.docker.com/engine/install/linux-postinstall/#manage-docker-as-a-non-root-user).
    *   **Rootless Mode:** Docker can also be installed and run in rootless mode, which provides enhanced security. Refer to [running the Docker daemon as a non-root user (rootless)](https://docs.docker.com/engine/security/rootless/) for instructions.

3.  **Uninstalling Docker Engine**

    *   **Uninstalling Packages:**

        ```bash
        sudo apt-get purge docker-ce docker-ce-cli containerd.io docker-compose-plugin
        ```

    *   **Removing Images, Containers, and Volumes:**  The above command does not automatically remove images, containers, or volumes on the host. To remove all images, containers, and volumes, use the following commands:

        ```bash
        sudo rm -rf /var/lib/docker
        sudo rm -rf /var/lib/containerd
        ```

    *   **Manual Removal:** Any manually created configuration files must be removed manually.

4.  **Next Steps**

    *   [Post-installation steps for Linux](https://docs.docker.com/engine/install/linux-postinstall/)
    *   [Developing with Docker](https://docs.docker.com/develop/)
