FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive

# Install basic tools + Python
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    python3 \
    python3-pip

# Install Node.js 22 (comes with npm)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g npm@latest

# Create non-root user
RUN useradd -m -s /bin/bash user

# Switch to user
USER user
WORKDIR /home/user
CMD ["bash"]
