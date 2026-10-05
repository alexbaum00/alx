// Backup manual: npm run db:backup
import { fazerBackup } from '../src/lib/backup.js';
import { prisma } from '../src/lib/prisma.js';

console.log(`Backup salvo em ${await fazerBackup()}`);
await prisma.$disconnect();
