#!/bin/bash

YES=0
NO=1

# Warn if not running inside a tmux session
if [ -z "${TMUX-}" ]; then
    echo "⚠️  Warning: This script is not running inside a tmux session."
    echo "It's recommended to run this inside tmux so it can continue if your connection drops."
    # If not a TTY (non-interactive), abort to avoid hanging or unexpected behavior
    if [ ! -t 0 ]; then
        echo "Non-interactive shell detected and no tmux session. Aborting. Start a tmux session and re-run the script."
        exit 1
    fi

    read -r -p "Continue without tmux? (y/N): " CONTINUE_WITHOUT_TMUX
    case "$CONTINUE_WITHOUT_TMUX" in
        [yY]|[yY][eE][sS])
            echo "Proceeding without tmux..."
            ;;
        *)
            echo "Aborting. Start a tmux session (e.g. 'tmux new -s deploy') and re-run the script.";
            exit 1
            ;;
    esac
fi

START_AT=$(date +%s)

# Load .env.deploy early to get branch names
if [ -f .env.deploy ]; then
    set -a
    source .env.deploy
    set +a
fi

# Set default branch names if not specified
BACKEND_BRANCH="${BACKEND_BRANCH:-main}"
FRONTEND_BRANCH="${FRONTEND_BRANCH:-main}"

echo "📋 Using branches:"
echo "   Backend: $BACKEND_BRANCH"
echo "   Frontend: $FRONTEND_BRANCH"
echo ""

git pull

cd frontend
git checkout "$FRONTEND_BRANCH"
git pull

cd ../backend
git checkout "$BACKEND_BRANCH"
git pull

cd ../document-generator
git pull

cd ..


# ===== Pre-flight command check =====
check_commands() {
    REQUIRED_COMMANDS=(
        git ssh curl tar sed awk grep column scp docker zip
    )

    MISSING=()

    for cmd in "${REQUIRED_COMMANDS[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            MISSING+=("$cmd")
        fi
    done

    if [ ${#MISSING[@]} -ne 0 ]; then
        echo "❌ Missing required commands:"
        for cmd in "${MISSING[@]}"; do
            echo "   - $cmd"
        done
        exit 1
    fi
}

check_commands

USE_CACHE=false
for arg in "$@"; do
  if [ "$arg" == "--use-cache" ]; then
    USE_CACHE=true
  fi
done

check_var() {
    if [ $# -eq 0 ]; then
        echo "check_var requires at least one variable name"
        exit 1
    fi

    for var_name in "$@"; do
        # ensure the variable is set and not empty
        if [ -z "${!var_name+x}" ] || [ -z "${!var_name}" ]; then
            echo "$var_name cannot be empty"
            exit 1
        fi
    done
}

check_deploy_server() {
    for var_name in DEPLOY_SERVER_IP DEPLOY_SERVER_SSH_PORT DEPLOY_SERVER_USER DEPLOY_SERVER_PATH AUTO_INSTALL; do
        if [ -z "${!var_name+x}" ] || [ -z "${!var_name}" ]; then
            return $NO
        fi
    done
    
    echo "Server info:"
    echo ""
    {
    echo "Host:Port:User:Path:"
    echo "──────────────────:──────:────────:──────"
    echo "$DEPLOY_SERVER_IP:$DEPLOY_SERVER_SSH_PORT:$DEPLOY_SERVER_USER:$DEPLOY_SERVER_PATH"
    } | column -t -s ':'
    echo ""

    echo "🔍 Checking SSH connectivity..."
    if ! ssh -o BatchMode=yes -o ConnectTimeout=5 -p "$DEPLOY_SERVER_SSH_PORT" "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "echo ok" 2>/dev/null | grep -q "ok"; then
        echo "❌ Cannot connect to $DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP on port $DEPLOY_SERVER_SSH_PORT"
        exit 1
    fi
    echo "✅ SSH server is reachable."

    return $YES
}

check_deploy_package() {
    for var_name in PACKAGE_PASSWORD; do
        if [ -z "${!var_name+x}" ] || [ -z "${!var_name}" ]; then
            return $NO
        fi
    done
    echo ""
    echo "a PACKAGE will be created with password protection."
    echo ""
    return $YES
}

check_download_server() {
    for var_name in DOWNLOAD_SERVER_IP DOWNLOAD_SERVER_SSH_PORT DOWNLOAD_SERVER_USER DOWNLOAD_SERVER_PATH; do
        if [ -z "${!var_name+x}" ] || [ -z "${!var_name}" ]; then
            return $NO
        fi
    done
    
    echo "Download server info:"
    echo ""
    {
    echo "Host:Port:User:Path:"
    echo "──────────────────:──────:────────:──────"
    echo "$DOWNLOAD_SERVER_IP:$DOWNLOAD_SERVER_SSH_PORT:$DOWNLOAD_SERVER_USER:$DOWNLOAD_SERVER_PATH"
    } | column -t -s ':'
    echo ""

    echo "🔍 Checking SSH connectivity to download server..."
    if ! ssh -o BatchMode=yes -o ConnectTimeout=5 -p "$DOWNLOAD_SERVER_SSH_PORT" "$DOWNLOAD_SERVER_USER@$DOWNLOAD_SERVER_IP" "echo ok" 2>/dev/null | grep -q "ok"; then
        echo "❌ Cannot connect to $DOWNLOAD_SERVER_USER@$DOWNLOAD_SERVER_IP on port $DOWNLOAD_SERVER_SSH_PORT"
        exit 1
    fi
    echo "✅ Download server SSH is reachable."

    return $YES
}

check_var LICENSING_SERVER_ADDRESS LICENSING_SERVER_API_KEY LICENSING_SERVER_PRE_INSTALL_API_KEY COMPILE BYPASS_LICENSE CUSTOMER_NAME

check_deploy_server
DEPLOY_ON_SERVER=$?
check_deploy_package
DEPLOY_PACKAGE=$?

if [ "${PACKAGE_UPLOAD}" = "TRUE" ]; then
    check_download_server
    DOWNLOAD_SERVER_AVAILABLE=$?

    if [ "$DOWNLOAD_SERVER_AVAILABLE" = $NO ]; then
        echo "❌ Error: PACKAGE_UPLOAD is TRUE but download server is not available."
        echo "Please set DOWNLOAD_SERVER_IP, DOWNLOAD_SERVER_SSH_PORT, DOWNLOAD_SERVER_USER, and DOWNLOAD_SERVER_PATH in .env.deploy."
        exit 1
    fi
fi

if [ "$DEPLOY_ON_SERVER" = $NO ] && [ "$DEPLOY_PACKAGE" = $NO ]; then
    echo "❌ Error: Insufficient deployment configuration."
    echo "To deploy on a server, please set DEPLOY_SERVER_IP, DEPLOY_SERVER_SSH_PORT, DEPLOY_SERVER_USER, DEPLOY_SERVER_PATH, and AUTO_INSTALL in .env.deploy."
    echo "To generate a deployable package, please set PACKAGE_PASSWORD in .env.deploy."
    exit 1
fi

if [ "${DISABLE_SUDO}" = "TRUE" ]; then
    SUDO=""
else
    SUDO="sudo"
fi

set -e

error_handler() {
    if [ -f .env.backup ]; then
        cp .env.backup .env
        rm .env.backup
    fi

    echo "❌❌❌ Error occurred in script at line: $1 ❌❌❌"
}

trap 'error_handler $LINENO' ERR

if [ ! -f .env ]; then
    cp .env.example .env
fi

if [ "$USE_CACHE" = true ] && [ -d task-management-deploy ] && [ "$(ls -A task-management-deploy)" ]; then
    echo "🗃️ Using cached task-management-deploy files, skipping Docker build and tar creation..."
else
    
    cp .env .env.backup

    # add a new line at the end of .env file
    sed -i -e '$a\' .env

    cat .env.deploy >> .env

    echo "🐳 Building Docker images..."
    $SUDO docker compose -f docker-compose.deploy.yml build

    echo "📥 Pulling external images..."
    $SUDO docker compose -f docker-compose.deploy.yml pull || true

    echo "💾 Saving Docker images..."
    rm -rf task-management-deploy
    mkdir -p task-management-deploy/files
    mkdir -p task-management-deploy/images

    for image in $($SUDO docker compose -f docker-compose.deploy.yml config | grep 'image:' | awk '{print $2}'); do
        echo "Saving $image..."
        image_name=$(echo $image | tr '/:' '-')
        $SUDO docker save "$image" | gzip > "task-management-deploy/images/${image_name}.tar.gz"
    done

    cp .env.backup .env
    rm -rf .env.backup

    echo "Creating deploy files ..."

    cp docker-compose.prod.yml task-management-deploy/files/docker-compose.yml

    cp -r Caddyfile .env.initial-production task-management-deploy/files/
    cp install.sh download-package.sh task-management-deploy/
fi

if [ "$DEPLOY_ON_SERVER" = $NO ]; then
    PACKAGE_FILE="task-management-deploy-$(date +%Y-%m-%d-%H-%M).zip"
    echo "🔐 Generating password-protected zip package: $PACKAGE_FILE"
    rm -f task-management-deploy*.zip
    zip -r -P "$PACKAGE_PASSWORD" "$PACKAGE_FILE" task-management-deploy >/dev/null
    echo "✅ Package created: $(pwd)/$PACKAGE_FILE"
    
    if [ "${PACKAGE_UPLOAD}" = "TRUE" ]; then
        echo "📤 Uploading package to download server..."
        ssh -p$DOWNLOAD_SERVER_SSH_PORT $DOWNLOAD_SERVER_USER@$DOWNLOAD_SERVER_IP "mkdir -p $DOWNLOAD_SERVER_PATH/$CUSTOMER_NAME"
        scp -P$DOWNLOAD_SERVER_SSH_PORT "$PACKAGE_FILE" $DOWNLOAD_SERVER_USER@$DOWNLOAD_SERVER_IP:$DOWNLOAD_SERVER_PATH/$CUSTOMER_NAME
        echo "✅ Package uploaded to download server: $DOWNLOAD_SERVER_USER@$DOWNLOAD_SERVER_IP:$DOWNLOAD_SERVER_PATH/$CUSTOMER_NAME/$PACKAGE_FILE"
    fi
    
else
    # install on remote server
    echo "📤 Copying deploy package to remote server..."
    ssh -p$DEPLOY_SERVER_SSH_PORT $DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP "rm -r $DEPLOY_SERVER_PATH/task-management-deploy || true"
    scp -P$DEPLOY_SERVER_SSH_PORT -r task-management-deploy/ $DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP:$DEPLOY_SERVER_PATH

    if [ "$AUTO_INSTALL" = true ]; then
        echo "📦 Extracting deployment tar file..."
        ssh -p$DEPLOY_SERVER_SSH_PORT $DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP "cd $DEPLOY_SERVER_PATH/task-management-deploy && ./install.sh"
        echo "✅ Deployment complete."
    fi
fi

END_AT=$(date +%s)
ELAPSED=$((END_AT - START_AT))
# Format elapsed time as HH:MM:SS
hours=$((ELAPSED/3600))
minutes=$(((ELAPSED%3600)/60))
seconds=$((ELAPSED%60))

echo "Installation abstract:"
echo ""
{
    echo "──────────────────:──────"
    echo "Use Cache:$USE_CACHE"

    if [ "$DEPLOY_ON_SERVER" = $NO ]; then
        echo "Deployed on Server:false"
        echo "Package password: $PACKAGE_PASSWORD"
        if [ "${PACKAGE_UPLOAD}" = "TRUE" ]; then
            echo "Package Upload:true"
            echo "Download Server:$DOWNLOAD_SERVER_IP"
            echo "Download Server Port:$DOWNLOAD_SERVER_SSH_PORT"
            echo "Download Server User:$DOWNLOAD_SERVER_USER"
            echo "Download Server Path:$DOWNLOAD_SERVER_PATH"
        else
            echo "Package Upload:false"
        fi
    else
        echo "Deployed on Server:true"
        echo "Host:$DEPLOY_SERVER_IP"
        echo "Port:$DEPLOY_SERVER_SSH_PORT"
        echo "User:$DEPLOY_SERVER_USER"
        echo "Deploy path:$DEPLOY_SERVER_PATH"
        echo "Auto Install:$AUTO_INSTALL"
    fi
    
    echo "Customer Name:$CUSTOMER_NAME"
    echo "Compile:$COMPILE"
    echo "Bypass Licensing:$BYPASS_LICENSE"
} | column -t -s ':'
echo "============================================"
echo "completed at:$(date +"%Y-%m-%d %H:%M:%S%z")"
printf "Elapsed time:%02d:%02d:%02d\n" "$hours" "$minutes" "$seconds"