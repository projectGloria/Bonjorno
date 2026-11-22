import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const ROOT_CONFIG_FILENAME = 'bonjorno.config.json';

function bonjornoRootConfigPlugin(): Plugin {
  const getConfigPath = () => path.resolve(process.cwd(), ROOT_CONFIG_FILENAME);

  return {
    name: 'bonjorno-root-config',
    configureServer(server) {
      server.middlewares.use('/__bonjorno/config', (req, res, next) => {
        const configPath = getConfigPath();

        if (req.method === 'GET') {
          if (!fs.existsSync(configPath)) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Config file not found' }));
            return;
          }
          try {
            const content = fs.readFileSync(configPath, 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(content);
          } catch {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Failed to read config file' }));
          }
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          let tooLarge = false;
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString('utf-8');
            if (body.length > 2 * 1024 * 1024) {
              tooLarge = true;
            }
          });
          req.on('end', () => {
            if (tooLarge) {
              res.statusCode = 413;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Payload too large' }));
              return;
            }
            try {
              const parsed = JSON.parse(body);
              if (
                !parsed ||
                typeof parsed !== 'object' ||
                parsed.app !== 'bonjorno' ||
                !parsed.settings
              ) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid Bonjorno config payload' }));
                return;
              }
              const formatted = `${JSON.stringify(parsed, null, 2)}\n`;
              const tmpPath = `${configPath}.tmp`;
              fs.writeFileSync(tmpPath, formatted, 'utf-8');
              fs.renameSync(tmpPath, configPath);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to parse or write config' }));
            }
          });
          return;
        }

        next();
      });
    },
    generateBundle() {
      const configPath = getConfigPath();
      if (fs.existsSync(configPath)) {
        const source = fs.readFileSync(configPath, 'utf-8');
        this.emitFile({
          type: 'asset',
          fileName: ROOT_CONFIG_FILENAME,
          source,
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), bonjornoRootConfigPlugin()],
  base: './',
  server: {
    fs: {
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/Music/**', '**/bonjorno.music.local.json'],
    },
    watch: {
      ignored: ['**/Music/**', '**/bonjorno.music.local.json'],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
    rollupOptions: {
      input: {
        newtab: 'index.html',
      },
    },
  },
});
