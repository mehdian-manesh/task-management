#!/bin/sh

set -e

RESUME_MODE=false

# Parse command line arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 <download-link> [--resume]"
    exit 1
fi

DOWNLOAD_LINK="$1"

# Check for --resume flag
if [ "$2" = "--resume" ]; then
    RESUME_MODE=true
fi

echo "📥 Downloading package from: $DOWNLOAD_LINK"

if [ "$RESUME_MODE" = true ]; then
    echo "⚠️  WARNING: Resume mode enabled - attempting to continue previous download if it exists"
fi

if [ -f .env.install ]; then
    set -a
    . ./.env.install
    set +a
fi

PACKAGE_FILE="charchoob-deploy.zip"

# Download the file with basic authentication if credentials are provided
if command -v curl >/dev/null 2>&1; then
    CURL_OPTS="-L -o $PACKAGE_FILE"
    
    # Add resume option if enabled
    if [ "$RESUME_MODE" = true ]; then
        CURL_OPTS="$CURL_OPTS -C -"
    fi
    
    if [ -n "$DOWNLOAD_USER" ] && [ -n "$DOWNLOAD_PASSWORD" ]; then
        CURL_OPTS="$CURL_OPTS -u $DOWNLOAD_USER:$DOWNLOAD_PASSWORD"
    fi
    
    curl $CURL_OPTS "$DOWNLOAD_LINK" || {
        echo "❌ Failed to download package"
        exit 1
    }
elif command -v wget >/dev/null 2>&1; then
    WGET_OPTS="-O $PACKAGE_FILE"
    
    # Add resume option if enabled
    if [ "$RESUME_MODE" = true ]; then
        WGET_OPTS="$WGET_OPTS -c"
    fi
    
    if [ -n "$DOWNLOAD_USER" ] && [ -n "$DOWNLOAD_PASSWORD" ]; then
        WGET_OPTS="$WGET_OPTS --user=$DOWNLOAD_USER --password=$DOWNLOAD_PASSWORD"
    fi
    
    wget $WGET_OPTS "$DOWNLOAD_LINK" || {
        echo "❌ Failed to download package"
        exit 1
    }
else
    echo "❌ Error: curl or wget is required to download the package"
    exit 1
fi

echo "✅ Package downloaded: $PACKAGE_FILE"

# Extract the package
echo "📦 Extracting package..."

# Use PACKAGE_PASSWORD from environment if available
if [ -z "$PACKAGE_PASSWORD" ]; then
    echo "❌ Failed to extract package. PACKAGE_PASSWORD not found in .env file."
    exit 1
fi

# Try to extract with available tools (unzip, 7z, 7zz) and overwrite existing files
EXTRACT_SUCCESS=false

if echo "trying with unzip command..." && command -v unzip >/dev/null 2>&1; then
    if unzip -o -P "$PACKAGE_PASSWORD" "$PACKAGE_FILE"; then
        echo "✅ Package extracted successfully using unzip (overwriting existing files)"
        EXTRACT_SUCCESS=true
    fi
elif echo "trying with 7z command..." && command -v 7z >/dev/null 2>&1; then
    if 7z x -p"$PACKAGE_PASSWORD" "$PACKAGE_FILE" -o. -y -aoa; then
        echo "✅ Package extracted successfully using 7z (overwriting existing files)"
        EXTRACT_SUCCESS=true
    fi
elif echo "trying with 7zz command..." && command -v 7zz >/dev/null 2>&1; then
    if 7zz x -p"$PACKAGE_PASSWORD" "$PACKAGE_FILE" -o. -y -aoa; then
        echo "✅ Package extracted successfully using 7zz (overwriting existing files)"
        EXTRACT_SUCCESS=true
    fi
fi

if [ "$EXTRACT_SUCCESS" = false ]; then
    echo "❌ Failed to extract package. Wrong password, corrupted file, or no extraction tool found (unzip/7z/7zz)."
    rm -f "$PACKAGE_FILE"
    exit 1
fi

# Clean up the downloaded zip file
rm -f "$PACKAGE_FILE"
echo "🧹 Cleaned up downloaded package file"

cd charchoob-deploy && ./install.sh