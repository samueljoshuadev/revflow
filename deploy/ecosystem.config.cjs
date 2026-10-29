// PM2 process definition for the Hostinger VPS.
// Runs the Next.js standalone server assembled by deploy/deploy.sh.
module.exports = {
  apps: [
    {
      name: "loovimob",
      cwd: "/var/www/loovimob/current",
      script: ".next/standalone/server.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "768M",
      env_file: "/var/www/loovimob/shared/.env.production",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "127.0.0.1",
      },
      error_file: "/var/log/loovimob/error.log",
      out_file: "/var/log/loovimob/out.log",
      time: true,
    },
  ],
};
