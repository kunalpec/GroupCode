FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TERM=xterm-256color

# Install basic tools + Python
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    python3 \
    python3-pip \
    git \
    bash \
    util-linux \
    && apt-get clean

# Install Node.js (no npm update)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs

# Create non-root user
RUN useradd -m -s /bin/bash user

# Set working directory
WORKDIR /home/user

# Give permissions
RUN chown -R user:user /home/user

# Switch to user
USER user

# Default shell
CMD ["bash"]
