import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: { DATABASE_URL: 'file:./test.db', IMAGENS_DIR: 'test-imagens', BACKUP_AUTOMATICO: 'false' },
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
  },
});
