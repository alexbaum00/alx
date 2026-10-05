// Esqueceu a senha? Rode no computador da oficina: npm run senha:redefinir
// Apaga a senha e desconecta todos os aparelhos; a nova senha é criada ao abrir o sistema neste computador.
import { redefinirAcesso } from '../src/services/authService.js';
import { prisma } from '../src/lib/prisma.js';

await redefinirAcesso();
await prisma.$disconnect();
console.log('Senha apagada. Abra http://localhost:3000 neste computador para criar a nova.');
