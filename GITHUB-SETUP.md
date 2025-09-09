# 🚀 Mantenimiento SR - GitHub Setup

## 1) Crear repo en GitHub

- <https://github.com/new>
- Name: `mantenimiento-sr`
- No README, no .gitignore, no license

## 2) Conectar remoto

```bash
git remote add origin https://github.com/emartinez/mantenimiento-sr.git
git branch -M main
git push -u origin main
```

## 3) Subir cambios

- Script rápido:

```bash
./quick-push.sh
```

- Manual:

```bash
git add .
git commit -m "mensaje"
git push origin main
```

## 4) PM2 (opcional)

```bash
npm run pm2:start:dev   # dev
npm run pm2:start       # prod
npm run pm2:logs
```

## 5) Cloudflare Tunnel (opcional)

```bash
npm run tunnel
```
