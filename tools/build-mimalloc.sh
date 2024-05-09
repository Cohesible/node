#!/bin/sh
set -e

BASE_DIR=$(cd "$(dirname "$0")/.." && pwd)
DEPS_DIR="$BASE_DIR/deps"

TARGET_VERSION=1.8.4 # v2.x.x doesn't seem to perform as well
TGZ_NAME="v${TARGET_VERSION}.tar.gz"
TGZ_URL="https://github.com/microsoft/mimalloc/archive/refs/tags/$TGZ_NAME"

curl -L "$TGZ_URL" --output $TGZ_NAME

MI_MALLOC_DIR="$DEPS_DIR/mimalloc"
mkdir -p "$MI_MALLOC_DIR"
tar -xzf $TGZ_NAME --strip=1 -C "$MI_MALLOC_DIR"

MI_MALLOC_OUT_DIR="$MI_MALLOC_DIR/out/release"
mkdir -p "$MI_MALLOC_OUT_DIR"
cd "$MI_MALLOC_OUT_DIR"

export MACOSX_DEPLOYMENT_TARGET="11.0"
cmake -D MI_USE_CXX=ON -D MI_SKIP_COLLECT_ON_EXIT=ON ../..
make
