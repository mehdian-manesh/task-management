#!/bin/sh

set -e
cd ..

mkdir -p task-management
cd task-management

if [ ! -f .env ]; then
    echo "No .env file found."
    echo "creating a .env file from .env.initial-production"
    cp ../task-management-deploy/files/.env.initial-production .env
fi

echo "Copying deploy files ..."
cp ../task-management-deploy/files/* ./

set -a
. ./.env
set +a

echo "Stopping existing containers ..."
docker compose down --rmi all || true

for tarfile in ../task-management-deploy/images/*.tar.gz ../task-management-deploy/images/*.tgz; do
    [ -e "$tarfile" ] || continue
    echo "Loading Docker image from $tarfile..." >&2
    gunzip -c "$tarfile" | docker load
done

docker compose up -d
docker system prune -f

set +e

echo "*** installation done ***"
echo
echo

sleep 10
docker compose down
sleep 3
docker compose up -d