#!/usr/bin/env bash
set -e

# Ejecuta migración opcionalmente una vez si RUN_MIGRATION_ONCE=1
if [ "$RUN_MIGRATION_ONCE" = "1" ]; then
  echo "RUN_MIGRATION_ONCE=1: ejecutando migración de volunteers..."
  # ejecutamos el script de migración (no fallar el arranque si falla la migración)
  node -r dotenv/config ./scripts/migrate-volunteers-cargo.mjs || true
  echo "Migración terminada (si hubo)."
fi

# Iniciar la app en producción
npm run start
