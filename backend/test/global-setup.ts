import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

// Recria o banco de teste do zero antes da suíte (nunca toca no banco real).
export default function setup() {
  for (const sufixo of ['', '-journal', '-wal', '-shm']) {
    rmSync(resolve(import.meta.dirname, '..', 'prisma', `test.db${sufixo}`), { force: true });
  }
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'ignore',
  });
}
