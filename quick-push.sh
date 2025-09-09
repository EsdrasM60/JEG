#!/bin/bash

# 🚀 Mantenimiento SR - Quick GitHub Deploy

set -e

if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "❌ No es un repositorio git. Ejecuta: git init"
  exit 1
fi

echo "📦 Agregando cambios..."
git add .

TS=$(date '+%Y-%m-%d %H:%M:%S')
echo "📝 Commit..."
git commit -m "🧰 Mantenimiento SR: $TS" || echo "ℹ️ Sin cambios para commitear"

echo "📤 Push a origin main..."
git push origin main

echo "✅ Listo"
