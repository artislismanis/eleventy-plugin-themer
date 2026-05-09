FROM node:22-slim

# Install common development tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends gh \
    && rm -rf /var/lib/apt/lists/*

# Install local Github Actions runner
RUN gh extension install https://github.com/nektos/gh-act

# Update NPM to the latest version
RUN npm install -g npm@latest

# Create non-root user (matches node image's default user)
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Set working directory
WORKDIR /workspace

# Default to non-root user
USER $USERNAME
