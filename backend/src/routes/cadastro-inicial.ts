// Autor Geral: Cadu Spadari - Autor Código BD: Felipe N. C. Moussa
// Express & BD
import { Router, Request, Response } from 'express';
import db from '../database';
const router = Router();

// Criar Instituicao e Curso (POST)
router.post('/', (req: Request, res: Response) => {
  const { nome_instituicao, nome_curso, usuario_id } = req.body ?? {};

  if (!nome_instituicao || !nome_curso) {
    return res.status(400).json({
      error: 'Nome da instituição e nome do curso são obrigatórios'
    });
  }

  const inserirCurso = (instituicaoId: number) => {
    const sqlCurso = `
      INSERT INTO CURSO (nome_curso, fk_instituicao_id_instituicao)
      VALUES (?, ?)
    `;

    db.run(sqlCurso, [nome_curso, instituicaoId], function (err: any) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Curso já cadastrado nesta instituição' });
        }
        return res.status(500).json({ error: err.message });
      }

      return res.status(201).json({
        instituicao: {
          id: instituicaoId,
          nome: nome_instituicao
        },
        curso: {
          id: this.lastID,
          nome: nome_curso,
          instituicao_id: instituicaoId
        }
      });
    });
  };

  const handleWithUsuarioId = (fkUsuarioId: number) => {
    const sqlInstituicao = `
      INSERT OR IGNORE INTO INSTITUICAO (nome_instituicao, fk_usuario_id_usuario)
      VALUES (?, ?)
    `;

    db.run(sqlInstituicao, [nome_instituicao, fkUsuarioId], function (err: any) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.get('SELECT id_instituicao FROM INSTITUICAO WHERE nome_instituicao = ?', [nome_instituicao], (err2: any, row: any) => {
        if (err2) {
          return res.status(500).json({ error: err2.message });
        }

        if (!row || !row.id_instituicao) {
          return res.status(500).json({ error: 'Não foi possível recuperar o ID da instituição' });
        }

        const instituicaoId = row.id_instituicao;
        inserirCurso(instituicaoId);
      });
    });
  };

  if (usuario_id) {
    handleWithUsuarioId(Number(usuario_id));
  } else {
    db.get('SELECT id_usuario FROM USUARIO LIMIT 1', [], (err: any, row: any) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!row || !row.id_usuario) {
        return res.status(400).json({
          error: 'Não há usuário disponível para associar à instituição. Forneça "usuario_id" no corpo da requisição ou crie um usuário primeiro.'
        });
      }

      handleWithUsuarioId(row.id_usuario);
    });
  }
});

// Exportar Router
export default router;