#!/bin/bash

# HomeEye Deployment Script for Linux/Mac
# Usage: ./deploy.sh [user@host] [options]

set -e

# Configuration
PI_USER=${PI_USER:-"pi"}
PI_HOST=${PI_HOST:-""}
REPO_URL=${REPO_URL:-"https://github.com/Aeell/HomeEye.git"}
BRANCH=${BRANCH:-"main"}
WEB_PORT=${WEB_PORT:-8420}
MJPEG_PORT=${MJPEG_PORT:-8421}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--user)
            PI_USER="$2"
            shift 2
            ;;
        -h|--host)
            PI_HOST="$2"
            shift 2
            ;;
        -r|--repo)
            REPO_URL="$2"
            shift 2
            ;;
        -b|--branch)
            BRANCH="$2"
            shift 2
            ;;
        --web-port)
            WEB_PORT="$2"
            shift 2
            ;;
        --mjpeg-port)
            MJPEG_PORT="$2"
            shift 2
            ;;
        *)
            if [[ -z "$PI_HOST" ]]; then
                PI_HOST="$1"
            fi
            shift
            ;;
    esac
done

if [[ -z "$PI_HOST" ]]; then
    log_error "Pi host not specified. Usage: $0 user@host"
    exit 1
fi

log_info "Deploying HomeEye to $PI_USER@$PI_HOST"
log_info "Repository: $REPO_URL (branch: $BRANCH)"
log_info "Ports: Web=$WEB_PORT, MJPEG=$MJPEG_PORT"

# Check if we can connect to the Pi
log_info "Testing SSH connection..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$PI_USER@$PI_HOST" "echo 'SSH connection successful'" >/dev/null 2>&1; then
    log_error "Cannot connect to $PI_USER@$PI_HOST via SSH"
    log_error "Make sure SSH keys are set up and the Pi is accessible"
    exit 1
fi

# Create remote directory
log_info "Creating remote directory..."
ssh "$PI_USER@$PI_HOST" "mkdir -p ~/homeeye"

# Copy files (excluding scripts and docs)
log_info "Copying files to Pi..."
rsync -av --exclude='scripts/' --exclude='.git/' --exclude='*.md' --exclude='*.log' \
    ./ "$PI_USER@$PI_HOST:~/homeeye/"

# Install dependencies and setup on Pi
log_info "Installing dependencies on Pi..."
ssh "$PI_USER@$PI_HOST" "cd ~/homeeye && npm install"

# Setup environment
log_info "Setting up environment..."
ssh "$PI_USER@$PI_HOST" "cd ~/homeeye && cp Raspi5/.env.template Raspi5/.env"

# Update environment variables
ssh "$PI_USER@$PI_HOST" "cd ~/homeeye && sed -i 's/WEB_PORT=.*/WEB_PORT=$WEB_PORT/' Raspi5/.env"
ssh "$PI_USER@$PI_HOST" "cd ~/homeeye && sed -i 's/MJPEG_PORT=.*/MJPEG_PORT=$MJPEG_PORT/' Raspi5/.env"

# Install systemd services
log_info "Installing systemd services..."
ssh "$PI_USER@$PI_HOST" "sudo cp ~/homeeye/Raspi5/services/*.service /etc/systemd/system/"
ssh "$PI_USER@$PI_HOST" "sudo systemctl daemon-reload"

# Enable and start services
log_info "Starting services..."
ssh "$PI_USER@$PI_HOST" "sudo systemctl enable homeeye-camera.service homeeye-web.service"
ssh "$PI_USER@$PI_HOST" "sudo systemctl restart homeeye-camera.service homeeye-web.service"

# Check status
log_info "Checking service status..."
sleep 2
ssh "$PI_USER@$PI_HOST" "sudo systemctl status homeeye-camera.service --no-pager -l"
ssh "$PI_USER@$PI_HOST" "sudo systemctl status homeeye-web.service --no-pager -l"

log_info "Deployment completed!"
log_info "HomeEye should be available at:"
log_info "  Web UI: http://$PI_HOST:$WEB_PORT"
log_info "  MJPEG Stream: http://$PI_HOST:$MJPEG_PORT/stream.mjpg"