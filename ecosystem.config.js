module.exports = {
  apps: [
    {
      name: 'mantenimiento-sr-dev',
      cwd: '.',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'development',
        PORT: '3000',
        NEXTAUTH_URL: 'http://localhost:3000'
      },
      autorestart: true,
      max_restarts: 10
    },
    {
      name: 'mantenimiento-sr',
      cwd: '.',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        NEXTAUTH_URL: 'http://localhost:3000'
      },
      autorestart: true,
      max_restarts: 10
    },
    {
      name: 'mantenimiento-sr-tunnel',
      cwd: '.',
      script: 'cloudflared',
      args: 'tunnel --url http://localhost:3000 --no-autoupdate --loglevel info --metrics 127.0.0.1:0',
      env: {},
      autorestart: true,
      max_restarts: 10
    }
  ]
};
