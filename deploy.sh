#!/bin/bash
echo "🚀 Building frontend..."
cd frontend && npm install && npm run build
cd ..

echo "🚀 Deploying front + back..."
vercel --prod --yes

echo "🎉 Deployment Complete."
