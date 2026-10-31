// Carrega backend/.env (se existir) antes de qualquer outro módulo ler as variáveis.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const arquivo = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (fs.existsSync(arquivo)) process.loadEnvFile(arquivo);
