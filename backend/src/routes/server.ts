import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import cors from 'cors';

import cadastroRoutes from './cadastro';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// servir o frontend (ajuste o caminho se sua pasta for outra)
app.use('/', express.static(path.join(process.cwd(), '../frontend')));

// rota de saúde
app.get('/health', (_req, res) => res.send('ok'));

// API (rota de cadastros)
app.use('/api/cadastros', cadastroRoutes);

// start
app.listen(PORT, () => {
  console.log(`✅ Server ON http://localhost:${PORT}`);
});
