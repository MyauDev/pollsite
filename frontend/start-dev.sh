#!/bin/bash

# Frontend Dev Server Startup Script
echo "🚀 Starting Frontend Development Server..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules not found!"
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ npm install failed!"
        exit 1
    fi
fi

# Check if backend API is running
echo "🔍 Checking backend API connection..."
if curl -s http://localhost:8000/ > /dev/null 2>&1; then
    echo "✅ Backend API is running on port 8000"
else
    echo "⚠️  Warning: Backend API not responding on port 8000"
    echo "   Make sure to run: make up"
fi

echo ""
echo "🌐 Starting Vite dev server on http://localhost:3000"
echo "   Backend proxy: http://localhost:8000"
echo ""

# Start Vite
npm run dev
