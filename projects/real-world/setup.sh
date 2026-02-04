#!/bin/bash

# Setup script for all JavaScript real-world projects
# This script will set up all three projects at once

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  JavaScript Real-World Projects - Complete Setup          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

NODE_VERSION=$(node -v)
print_success "Node.js $NODE_VERSION detected"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Setting up Blog Engine"
echo "════════════════════════════════════════════════════════════"
echo ""

cd blog-engine || exit

if [ -f "package.json" ]; then
    print_status "Installing dependencies..."
    npm install --silent
    print_success "Dependencies installed"
    
    if [ ! -f ".env" ]; then
        print_status "Creating .env file..."
        cp .env.example .env
        print_success ".env file created"
    fi
    
    print_status "Initializing database..."
    npm run init-db
    print_success "Database initialized"
    
    print_status "Seeding database..."
    npm run seed
    print_success "Database seeded with sample data"
    
    print_success "Blog Engine setup complete!"
    print_warning "Access at: http://localhost:3000"
    print_warning "Admin login: admin@blog.com / admin123"
else
    print_error "package.json not found in blog-engine"
fi

cd ..

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Setting up Chat Application"
echo "════════════════════════════════════════════════════════════"
echo ""

cd chat-application || exit

if [ -f "package.json" ]; then
    print_status "Installing dependencies..."
    npm install --silent
    print_success "Dependencies installed"
    
    if [ ! -f ".env" ]; then
        print_status "Creating .env file..."
        cp .env.example .env
        print_success ".env file created"
    fi
    
    print_status "Initializing database..."
    npm run init-db
    print_success "Database initialized"
    
    print_success "Chat Application setup complete!"
    print_warning "Access at: http://localhost:3001"
else
    print_error "package.json not found in chat-application"
fi

cd ..

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Setting up Package Manager"
echo "════════════════════════════════════════════════════════════"
echo ""

cd package-manager || exit

if [ -f "package.json" ]; then
    print_status "Installing dependencies..."
    npm install --silent
    print_success "Dependencies installed"
    
    print_status "Setting up package registry..."
    npm run setup-registry
    print_success "Registry created with sample packages"
    
    print_success "Package Manager setup complete!"
    print_warning "Usage: node bin/mini-pkg.js <command>"
else
    print_error "package.json not found in package-manager"
fi

cd ..

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    SETUP COMPLETE! 🎉                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "All three projects are ready to use!"
echo ""
echo "Quick Start Commands:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Blog Engine (Port 3000):"
echo "   cd blog-engine && npm start"
echo ""
echo "💬 Chat Application (Port 3001):"
echo "   cd chat-application && npm start"
echo ""
echo "📦 Package Manager:"
echo "   cd package-manager"
echo "   node bin/mini-pkg.js install express"
echo "   node bin/mini-pkg.js graph"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "For detailed documentation, see the README.md in each project."
echo ""
