// Autor Geral: Cadu Spadari - Autor Código BD: Felipe N. C. Moussa
// Express & BD etc.
import express from 'express';
import crypto from 'node:crypto';
import db from '../database';
import nodemailer from 'nodemailer';
const router = express.Router();

function hashSenha(senha: any) {
  return crypto.createHash('sha256').update(senha).digest('hex');
}

// Cadastrar (POST)
router.post('/cadastro', function(req: any, res: any) {
  const nome = req.body.nome;
  const email = req.body.email;
  const telefone = req.body.telefone;
  const senha = req.body.senha;

  if (!nome || !email || !senha) {
    return res.status(400).json({
      error: 'Nome, email e senha são obrigatórios'
    });
  }

  const senhaHash = hashSenha(senha);

  const sql = 'INSERT INTO USUARIO (nome_usuario, email, telefone, senha) VALUES (?, ?, ?, ?)';

  db.run(sql, [nome, email, telefone || null, senhaHash], function(err: any) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'E-mail já cadastrado' });
      }
      return res.status(500).json({ error: err.message });
    }

    return res.status(201).json({
      id: this.lastID,
      nome: nome,
      email: email,
      telefone: telefone || null
    });
  });
});

// Login (POST)
router.post('/login', function(req: any, res: any) {
  const email = req.body.email;
  const senha = req.body.senha;

  if (!email || !senha) {
    return res.status(400).json({
      error: 'Email e senha são obrigatórios'
    });
  }

  const senhaHash = hashSenha(senha);

  const sql = 'SELECT id_usuario AS id, nome_usuario AS nome, email, telefone FROM USUARIO WHERE email = ? AND senha = ?';

  db.get(sql, [email, senhaHash], function(err: any, row: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    return res.json(row);
  });
});

// Recuperação de Senha (POST)
router.post('/esqueci-senha', function(req: any, res: any) {
  const email = req.body.email;

  if (!email) {
    return res.status(400).json({
      error: 'E-mail é obrigatório'
    });
  }

  const sql = 'SELECT id_usuario AS id, nome_usuario AS nome, email FROM USUARIO WHERE email = ?';

  db.get(sql, [email], function(err: any, row: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(404).json({ error: 'E-mail não cadastrado no sistema' });
    }

    const token = crypto.randomBytes(32).toString('hex');

    const agora = new Date();
    const expiraEm = new Date(agora.getTime() + 60 * 60 * 1000);

    const sqlToken = 'INSERT INTO tokens_recuperacao (usuario_id, token, expira_em) VALUES (?, ?, ?)';

    db.run(sqlToken, [row.id, token, expiraEm.toISOString()], function(errToken: any) {
      if (errToken) {
        return res.status(500).json({ error: 'Erro ao gerar token de recuperação' });
      }

      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return res.status(500).json({
          error: 'Serviço de e-mail não configurado. Configure EMAIL_USER e EMAIL_PASS no arquivo .env'
        });
      }

      const urlRecuperacao = process.env.URL_BASE || 'http://localhost:3000';
      const linkRecuperacao = urlRecuperacao + '/pages/recuperar-senha.html?token=' + token;

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

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      transporter.sendMail(mailOptions, function(error: any, info: any) {
        if (error) {
          db.run('DELETE FROM tokens_recuperacao WHERE token = ?', [token]);

          console.log('Erro ao enviar email:', error);
          console.log('Código do erro:', error.code);
          console.log('Mensagem do erro:', error.message);

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

        console.log('Email enviado com sucesso!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);

        return res.json({
          message: 'E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada (e a pasta de spam).'
        });
      });
    });
  });
});

// Redefinir Senha (POST)
router.post('/redefinir-senha', function(req: any, res: any) {
  // Pega o token e a nova senha que vieram no corpo da requisição
  const token = req.body.token;
  const novaSenha = req.body.novaSenha;

  if (!token || !novaSenha) {
    return res.status(400).json({
      error: 'Token e nova senha são obrigatórios'
    });
  }

  if (novaSenha.length < 6) {
    return res.status(400).json({
      error: 'A senha deve ter pelo menos 6 caracteres'
    });
  }

  const sql = 'SELECT * FROM tokens_recuperacao WHERE token = ? AND usado = 0';

  db.get(sql, [token], function(err: any, tokenRow: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!tokenRow) {
      return res.status(404).json({ error: 'Token inválido ou já utilizado' });
    }

    const agora = new Date();
    const expiraEm = new Date(tokenRow.expira_em);

    if (agora > expiraEm) {
      db.run('UPDATE tokens_recuperacao SET usado = 1 WHERE token = ?', [token]);
      return res.status(400).json({ error: 'Token expirado. Solicite uma nova recuperação de senha.' });
    }

    const senhaHash = hashSenha(novaSenha);

    const sqlUpdate = 'UPDATE USUARIO SET senha = ? WHERE id_usuario = ?';

    db.run(sqlUpdate, [senhaHash, tokenRow.usuario_id], function(errUpdate: any) {
      if (errUpdate) {
        return res.status(500).json({ error: 'Erro ao atualizar senha' });
      }

      db.run('UPDATE tokens_recuperacao SET usado = 1 WHERE token = ?', [token]);

      return res.json({
        message: 'Senha redefinida com sucesso!'
      });
    });
  });
});

// Exportar Router
export default router;