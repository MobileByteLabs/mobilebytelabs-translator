#!/bin/bash

# MobileByteLabs Translator - Simple Setup Script

echo "🚀 Setting up MobileByteLabs Translator..."

# Backend Setup
echo "📦 Installing backend dependencies..."
cd backend
npm install
echo "✅ Backend dependencies installed"

# Create backend .env file
echo "📝 Setting up backend environment file..."
cp .env.example .env
echo "✅ Backend .env file created"

cd ..

# Frontend Setup
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
echo "✅ Frontend dependencies installed"

# Create frontend .env file
echo "📝 Setting up frontend environment file..."
cp .env.example .env
echo "✅ Frontend .env file created"

cd ..

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update GitHub OAuth credentials in backend/.env"
echo "2. Start backend: cd backend && npm run dev"
echo "3. Start frontend: cd frontend && npm start"
echo "4. Open http://localhost:3000 in your browser"