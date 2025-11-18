// Autor Geral: Cadu Spadari - Autor Código BD: Felipe N. C. Moussa
// Express & BD
import { Router, Request, Response } from 'express';
import db from '../database';
const router = Router();

// Lista todas as instituições (GET)
router.get('/', function(_req: Request, res: Response) {
  const sql = `
    SELECT
      id_instituicao AS id,
      nome_instituicao AS nome,
      fk_usuario_id_usuario AS usuario_id,
      NULL AS criado_em
    FROM INSTITUICAO
    ORDER BY id_instituicao DESC
  `;

  db.all(sql, [], function(err: any, rows: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json(rows);
  });
});

// Busca instituição por ID (GET)
router.get('/:id', function(req: Request, res: Response) {
  const id = req.params.id;

  const sql = `
    SELECT
      id_instituicao AS id,
      nome_instituicao AS nome,
      fk_usuario_id_usuario AS usuario_id
    FROM INSTITUICAO
    WHERE id_instituicao = ?
  `;

  db.get(sql, [id], function(err: any, row: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(404).json({ error: 'Instituição não encontrada' });
    }

    return res.json(row);
  });
});

// Cria nova instituição (POST)
router.post('/', function(req: Request, res: Response) {
  const nome = req.body.nome;
  const usuario_id = req.body.usuario_id;

  if (!nome) {
    return res.status(400).json({ error: 'Nome da instituição é obrigatório' });
  }

  const inserirInstituicao = (fkUsuarioId: number) => {
    const sql = `
      INSERT INTO INSTITUICAO (nome_instituicao, fk_usuario_id_usuario)
      VALUES (?, ?)
    `;
    db.run(sql, [nome, fkUsuarioId], function(err: any) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Instituição já cadastrada' });
        }
        if (err.message.includes('FOREIGN KEY constraint failed')) {
          return res.status(404).json({ error: 'Usuário não encontrado para associação' });
        }
        return res.status(500).json({ error: err.message });
      }

      return res.status(201).json({
        id: this.lastID,
        nome: nome,
        usuario_id: Number(fkUsuarioId)
      });
    });
  };

  if (usuario_id) {
    return inserirInstituicao(Number(usuario_id));
  }

  db.get('SELECT id_usuario FROM USUARIO LIMIT 1', [], (err: any, row: any) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row || !row.id_usuario) {
      return res.status(400).json({
        error: 'Não há usuário disponível para associar à instituição. Forneça "usuario_id" no corpo da requisição ou crie um usuário primeiro.'
      });
    }

    return inserirInstituicao(row.id_usuario);
  });
});

// Atualiza instituição (PUT)
router.put('/:id', function(req: Request, res: Response) {
  const id = req.params.id;
  const nome = req.body.nome;

  if (!nome) {
    return res.status(400).json({ error: 'Nome da instituição é obrigatório' });
  }

  const sql = 'UPDATE INSTITUICAO SET nome_instituicao = ? WHERE id_instituicao = ?';

  db.run(sql, [nome, id], function(err: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Instituição não encontrada' });
    }

    return res.json({ id: Number(id), nome: nome });
  });
});

// Exclui instituição (DELETE)
router.delete('/:id', function(req: Request, res: Response) {
  const id = req.params.id;

  const sql = 'DELETE FROM INSTITUICAO WHERE id_instituicao = ?';

  db.run(sql, [id], function(err: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Instituição não encontrada' });
    }

    return res.json({ message: 'Instituição excluída com sucesso' });
  });
});

// Exportar Router
export default router;