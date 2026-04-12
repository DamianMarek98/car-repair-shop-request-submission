#!/bin/bash
set -e

# Run this script from inside car-parts-scraper/
# Output: ../renocar-scraper-win.zip

PACKAGE_DIR="../renocar-win-package"
NODE_VERSION="20.19.0"

echo "=== Building RENOCAR Windows package ==="

# 1. Compile TypeScript
echo "[1/6] Compiling TypeScript..."
npm run build

# 2. Set up package directory
echo "[2/6] Setting up package directory..."
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

# 3. Copy compiled output (includes public/ via copy-static)
echo "[3/6] Copying compiled output..."
cp -r dist "$PACKAGE_DIR/"

# 4. Copy package.json (required for Node.js ESM module resolution)
cp package.json "$PACKAGE_DIR/"

# 5. Install production-only dependencies directly into package dir
echo "[4/6] Installing production dependencies..."
cp package-lock.json "$PACKAGE_DIR/"
cd "$PACKAGE_DIR"
npm ci --omit=dev --silent
rm package-lock.json
cd -

# 6. Download portable Node.js for Windows (just node.exe, ~30MB)
echo "[5/6] Downloading portable Node.js v${NODE_VERSION} for Windows..."
mkdir -p "$PACKAGE_DIR/node"
curl -L --progress-bar \
  "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip" \
  -o /tmp/node-win.zip
unzip -p /tmp/node-win.zip "node-v${NODE_VERSION}-win-x64/node.exe" > "$PACKAGE_DIR/node/node.exe"
echo "  node.exe downloaded ($(du -sh "$PACKAGE_DIR/node/node.exe" | cut -f1))"

# 7. Copy start.bat to package root
cp scripts/start.bat "$PACKAGE_DIR/"

# 8. Create zip
echo "[6/6] Creating zip..."
cd ..
zip -r renocar-scraper-win.zip renocar-win-package/ -x "*.DS_Store"
ZIP_SIZE=$(du -sh renocar-scraper-win.zip | cut -f1)

echo ""
echo "=== Done ==="
echo "  Package: $(pwd)/renocar-scraper-win.zip ($ZIP_SIZE)"
echo ""
echo "Windows setup:"
echo "  1. Extract renocar-scraper-win.zip"
echo "  2. Double-click start.bat"
echo "  3. First run downloads Playwright Chromium ~150MB (internet required once)"
echo "  4. Open http://localhost:3000 in browser"
