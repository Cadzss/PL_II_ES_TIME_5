// autor: Cadu Spadari
// Importa o Express (biblioteca para criar servidor web)
import express from 'express';
// Importa o módulo crypto do Node.js para criptografar senhas
import crypto from 'node:crypto';
// Importa a conexão do banco de dados
import db from '../database';

// Cria um roteador do Express para agrupar as rotas de autenticação
const router = express.Router();

// Função para criptografar a senha antes de salvar no banco
// Recebe a senha em texto e retorna a senha criptografada
function hashSenha(senha: any) {
  // Usa o algoritmo SHA-256 para criptografar a senha
  return crypto.createHash('sha256').update(senha).digest('hex');
}

// Rota POST /api/auth/cadastro - Cadastra um novo usuário
// Quando alguém faz uma requisição POST para /api/auth/cadastro, esta função é executada
router.post('/cadastro', function(req: any, res: any) {
  // Pega os dados que vieram no corpo da requisição (nome, email, telefone, senha)
  const nome = req.body.nome;
  const email = req.body.email;
  const telefone = req.body.telefone;
  const senha = req.body.senha;

  // Verifica se os campos obrigatórios foram preenchidos
  if (!nome || !email || !senha) {
    // Se faltar algum campo, retorna erro 400 (Bad Request)
    return res.status(400).json({ 
      error: 'Nome, email e senha são obrigatórios' 
    });
  }

  // Criptografa a senha antes de salvar no banco (por segurança)
  const senhaHash = hashSenha(senha);

  // Comando SQL para inserir um novo usuário na tabela
  const sql = 'INSERT INTO usuarios (nome, email, telefone, senha) VALUES (?, ?, ?, ?)';
  
  // Executa o comando SQL no banco de dados
  // Os valores ? serão substituídos pelos valores do array [nome, email, telefone, senhaHash]
  db.run(sql, [nome, email, telefone || null, senhaHash], function(err: any) {
    // Se acontecer algum erro ao executar o SQL
    if (err) {
      // Verifica se o erro é porque o email já existe no banco
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'E-mail já cadastrado' });
      }
      // Se for outro tipo de erro, retorna erro 500 (Internal Server Error)
      return res.status(500).json({ error: err.message });
    }
    
    // Se tudo deu certo, retorna os dados do usuário criado (sem a senha por segurança)
    return res.status(201).json({ 
      id: this.lastID,  // ID que foi gerado automaticamente pelo banco
      nome: nome, 
      email: email, 
      telefone: telefone || null 
    });
  });
});

// Rota POST /api/auth/login - Autentica um usuário (faz login)
// Quando alguém faz uma requisição POST para /api/auth/login, esta função é executada
router.post('/login', function(req: any, res: any) {
  // Pega o email e senha que vieram no corpo da requisição
  const email = req.body.email;
  const senha = req.body.senha;

  // Verifica se os campos foram preenchidos
  if (!email || !senha) {
    // Se faltar algum campo, retorna erro 400 (Bad Request)
    return res.status(400).json({ 
      error: 'Email e senha são obrigatórios' 
    });
  }

  // Criptografa a senha para comparar com a senha que está no banco (que também está criptografada)
  const senhaHash = hashSenha(senha);

  // Comando SQL para buscar o usuário no banco pelo email e senha
  const sql = 'SELECT id, nome, email, telefone FROM usuarios WHERE email = ? AND senha = ?';
  
  // Executa o comando SQL no banco de dados
  // Os valores ? serão substituídos pelos valores do array [email, senhaHash]
  db.get(sql, [email, senhaHash], function(err: any, row: any) {
    // Se acontecer algum erro ao executar o SQL
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se não encontrar nenhum usuário com esse email e senha
    if (!row) {
      // Retorna erro 401 (Unauthorized - não autorizado)
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    // Se encontrou o usuário, retorna os dados dele (sem a senha por segurança)
    return res.json(row);
  });
});

// Exporta o roteador para ser usado no servidor principal
export default router;

