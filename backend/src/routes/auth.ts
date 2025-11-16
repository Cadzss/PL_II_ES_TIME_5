// autor: Cadu Spadari
// Importa o Express (biblioteca para criar servidor web)
import express from 'express';
// Importa o módulo crypto do Node.js para criptografar senhas e gerar tokens
import crypto from 'node:crypto';
// Importa a conexão do banco de dados
import db from '../database';
// Importa o nodemailer para enviar e-mails
import nodemailer from 'nodemailer';

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

// Rota POST /api/auth/esqueci-senha - Envia e-mail de recuperação de senha
// Quando alguém faz uma requisição POST para /api/auth/esqueci-senha, esta função é executada
router.post('/esqueci-senha', function(req: any, res: any) {
  // Pega o email que veio no corpo da requisição
  const email = req.body.email;

  // Verifica se o email foi preenchido
  if (!email) {
    // Se faltar o email, retorna erro 400 (Bad Request)
    return res.status(400).json({ 
      error: 'E-mail é obrigatório' 
    });
  }

  // Comando SQL para verificar se o email existe no banco
  const sql = 'SELECT id, nome, email FROM usuarios WHERE email = ?';
  
  // Executa o comando SQL no banco de dados
  db.get(sql, [email], function(err: any, row: any) {
    // Se acontecer algum erro ao executar o SQL
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se não encontrar nenhum usuário com esse email
    if (!row) {
      // Retorna erro 404 (Not Found)
      return res.status(404).json({ error: 'E-mail não cadastrado no sistema' });
    }

    // Gera um token único de 32 caracteres para recuperação de senha
    const token = crypto.randomBytes(32).toString('hex');
    
    // Define a data de expiração (1 hora a partir de agora)
    const agora = new Date();
    const expiraEm = new Date(agora.getTime() + 60 * 60 * 1000); // 1 hora em milissegundos
    
    // Salva o token no banco de dados
    const sqlToken = 'INSERT INTO tokens_recuperacao (usuario_id, token, expira_em) VALUES (?, ?, ?)';
    
    db.run(sqlToken, [row.id, token, expiraEm.toISOString()], function(errToken: any) {
      if (errToken) {
        return res.status(500).json({ error: 'Erro ao gerar token de recuperação' });
      }

      // Se não tiver configurado as variáveis de ambiente, retorna erro
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return res.status(500).json({ 
          error: 'Serviço de e-mail não configurado. Configure EMAIL_USER e EMAIL_PASS no arquivo .env' 
        });
      }

      // Cria a URL de recuperação (ajuste conforme sua URL)
      const urlRecuperacao = process.env.URL_BASE || 'http://localhost:3000';
      const linkRecuperacao = urlRecuperacao + '/pages/recuperar-senha.html?token=' + token;

      // Configura o e-mail a ser enviado
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Recuperação de Senha - NotaDez',
        html: `
          <h2>Recuperação de Senha</h2>
          <p>Olá, ${row.nome}!</p>
          <p>Você solicitou a recuperação de senha. Clique no link abaixo para redefinir sua senha:</p>
          <p><a href="${linkRecuperacao}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Redefinir Senha</a></p>
          <p>Ou copie e cole este link no navegador:</p>
          <p>${linkRecuperacao}</p>
          <p><strong>Este link expira em 1 hora.</strong></p>
          <p>Se você não solicitou esta recuperação, ignore este e-mail.</p>
        `
      };

      // Configura o transporte de e-mail usando Gmail
      // NOTA: Você precisa configurar as variáveis de ambiente no arquivo .env:
      // EMAIL_USER=seu-email@gmail.com
      // EMAIL_PASS=sua-senha-de-app (não use a senha normal, use "Senha de App" do Gmail)
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true para 465, false para outras portas
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Envia o e-mail
      transporter.sendMail(mailOptions, function(error: any, info: any) {
        if (error) {
          // Se der erro ao enviar, remove o token criado
          db.run('DELETE FROM tokens_recuperacao WHERE token = ?', [token]);
          
          // Mostra o erro completo no console para debug
          console.log('Erro ao enviar email:', error);
          console.log('Código do erro:', error.code);
          console.log('Mensagem do erro:', error.message);
          
          // Retorna mensagem de erro mais detalhada para debug
          var mensagemErro = 'Erro ao enviar e-mail. ';
          if (error.code === 'EAUTH') {
            mensagemErro += 'Credenciais inválidas. Verifique EMAIL_USER e EMAIL_PASS no arquivo .env. Certifique-se de usar uma "Senha de App" do Gmail, não a senha normal.';
          } else if (error.code === 'ECONNECTION') {
            mensagemErro += 'Erro de conexão. Verifique sua internet e as configurações de firewall.';
          } else if (error.response) {
            mensagemErro += 'Resposta do servidor: ' + error.response;
          } else {
            mensagemErro += 'Detalhes: ' + error.message;
          }
          
          return res.status(500).json({ 
            error: mensagemErro 
          });
        }

        // Se deu certo, mostra informações no console
        console.log('Email enviado com sucesso!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);

        // Se deu certo, retorna sucesso
        return res.json({ 
          message: 'E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada (e a pasta de spam).' 
        });
      });
    });
  });
});

// Rota POST /api/auth/redefinir-senha - Redefine a senha usando o token
// Quando alguém faz uma requisição POST para /api/auth/redefinir-senha, esta função é executada
router.post('/redefinir-senha', function(req: any, res: any) {
  // Pega o token e a nova senha que vieram no corpo da requisição
  const token = req.body.token;
  const novaSenha = req.body.novaSenha;

  // Verifica se os campos foram preenchidos
  if (!token || !novaSenha) {
    return res.status(400).json({ 
      error: 'Token e nova senha são obrigatórios' 
    });
  }

  // Verifica se a senha tem pelo menos 6 caracteres
  if (novaSenha.length < 6) {
    return res.status(400).json({ 
      error: 'A senha deve ter pelo menos 6 caracteres' 
    });
  }

  // Busca o token no banco de dados
  const sql = 'SELECT * FROM tokens_recuperacao WHERE token = ? AND usado = 0';
  
  db.get(sql, [token], function(err: any, tokenRow: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se não encontrar o token
    if (!tokenRow) {
      return res.status(404).json({ error: 'Token inválido ou já utilizado' });
    }

    // Verifica se o token expirou
    const agora = new Date();
    const expiraEm = new Date(tokenRow.expira_em);
    
    if (agora > expiraEm) {
      // Marca o token como usado mesmo que tenha expirado
      db.run('UPDATE tokens_recuperacao SET usado = 1 WHERE token = ?', [token]);
      return res.status(400).json({ error: 'Token expirado. Solicite uma nova recuperação de senha.' });
    }

    // Criptografa a nova senha
    const senhaHash = hashSenha(novaSenha);

    // Atualiza a senha do usuário
    const sqlUpdate = 'UPDATE usuarios SET senha = ? WHERE id = ?';
    
    db.run(sqlUpdate, [senhaHash, tokenRow.usuario_id], function(errUpdate: any) {
      if (errUpdate) {
        return res.status(500).json({ error: 'Erro ao atualizar senha' });
      }

      // Marca o token como usado
      db.run('UPDATE tokens_recuperacao SET usado = 1 WHERE token = ?', [token]);

      // Retorna sucesso
      return res.json({ 
        message: 'Senha redefinida com sucesso!' 
      });
    });
  });
});

// Exporta o roteador para ser usado no servidor principal
export default router;

