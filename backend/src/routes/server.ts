//Autor: Cadu Spadari
// Importa a configuração do dotenv para variáveis de ambiente
import 'dotenv/config';
// Importa módulos do Node.js para manipulação de caminhos
import path from 'node:path';
// Importa o Express para criar o servidor
import express from 'express';
// Importa o CORS para permitir requisições de outros domínios
import cors from 'cors';

// Importa todas as rotas da aplicação
import authRoutes from './auth';
import instituicoesRoutes from './instituicoes';
import cursosRoutes from './cursos';
import disciplinasRoutes from './disciplinas';
import turmasRoutes from './turmas';
import alunosRoutes from './alunos';
import notasRoutes from './notas';
import cadastroInicialRoutes from './cadastro-inicial';

// Cria uma instância do Express
const app = express();

// Define a porta do servidor (usa a variável de ambiente PORT ou 3000 como padrão)
const PORT = Number(process.env.PORT) || 3000;

// ========== MIDDLEWARES ==========
// Habilita o CORS para permitir requisições de qualquer origem
app.use(cors());
// Permite que o Express entenda requisições com corpo em JSON
app.use(express.json());
// Permite que o Express entenda requisições com corpo em URL-encoded
app.use(express.urlencoded({ extended: true }));

// ========== ROTAS DE API ==========
// Rota de saúde para verificar se o servidor está funcionando
app.get('/health', function(req: any, res: any) {
  res.send('ok');
});

// Rotas de autenticação (login e cadastro de usuário)
app.use('/api/auth', authRoutes);

// Rotas de cadastro inicial (instituição + curso)
app.use('/api/cadastro-inicial', cadastroInicialRoutes);

// Rotas de instituições (CRUD completo)
app.use('/api/instituicoes', instituicoesRoutes);

// Rotas de cursos (CRUD completo)
app.use('/api/cursos', cursosRoutes);

// Rotas de disciplinas (CRUD completo)
app.use('/api/disciplinas', disciplinasRoutes);

// Rotas de turmas (CRUD completo, alunos, disciplinas)
app.use('/api/turmas', turmasRoutes);

// Rotas de alunos (CRUD completo, importação CSV)
app.use('/api/alunos', alunosRoutes);

// Rotas de notas (CRUD completo)
app.use('/api/notas', notasRoutes);

// ========== SERVIÇO DE ARQUIVOS ESTÁTICOS ==========
// Serve os arquivos estáticos do frontend (HTML, CSS, JS)
// IMPORTANTE: Esta linha deve vir DEPOIS das rotas da API para não interceptar as requisições
app.use('/', express.static(path.join(process.cwd(), '../frontend')));

// ========== INICIALIZAÇÃO DO SERVIDOR ==========
// Inicia o servidor na porta definida
app.listen(PORT, () => {
  console.log(`✅ Server ON http://localhost:${PORT}`);
});
