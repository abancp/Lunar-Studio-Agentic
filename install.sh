#!/usr/bin/env bash

set -e

# ---------- Colors ----------
GREEN="\033[1;32m"
BLUE="\033[1;34m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
RESET="\033[0m"

print_step() {
  echo -e "${BLUE}➜ $1${RESET}"
}

print_success() {
  echo -e "${GREEN}✔ $1${RESET}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${RESET}"
}

print_error() {
  echo -e "${RED}✖ $1${RESET}"
}

echo -e "${GREEN}"
echo "====================================="
echo "      Lunar Studio CLI Installer     "
echo "====================================="
echo -e "${RESET}"

cd "$(dirname "$0")"

# ---------- Detect Package Manager ----------
if command -v pnpm &> /dev/null; then
  PM="pnpm"
elif command -v npm &> /dev/null; then
  PM="npm"
else
  print_error "Neither pnpm nor npm is installed."
  exit 1
fi

print_success "Using package manager: $PM"
echo ""

# ---------- Install Dependencies ----------
print_step "Installing dependencies..."
$PM install
print_success "Dependencies installed"

# ---------- Build ----------
print_step "Building project..."
$PM run build
print_success "Build completed"

CLI_PATH="dist/src/cli/index.js"

if [ ! -f "$CLI_PATH" ]; then
  print_error "Build output not found at $CLI_PATH"
  exit 1
fi

# ---------- Make Executable ----------
print_step "Setting executable permission..."
chmod +x "$CLI_PATH"
print_success "Executable permission set"

# ---------- Global Install ----------
print_step "Installing globally..."

if [ "$PM" = "pnpm" ]; then
  pnpm link --global
else
  npm install -g .
fi

print_success "Global installation complete"

# ---------- Refresh Shell ----------
hash -r 2>/dev/null || true

echo ""
print_step "Verifying installation..."

if command -v lunarstudio &> /dev/null; then
  print_success "Lunar Studio installed successfully"
  echo ""
  echo -e "${GREEN}Run:${RESET} lunarstudio setup"
else
  print_warning "Command not detected in current shell"
  echo ""
  echo "Try restarting your terminal and run:"
  echo "  lunarstudio --help"
  exit 1
fi

echo ""
print_success "Installation finished"
echo ""
