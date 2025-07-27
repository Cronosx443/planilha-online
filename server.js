const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/events', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM events ORDER BY eventDate');
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar eventos:', err);
        res.status(500).json({ error: 'Erro ao buscar eventos' });
    }
});

app.post('/api/events', async (req, res) => {
    const novoEvento = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO events (eventDate, eventName, eventLocation, observations, startTime, endTime, totalHours, baseFee, overtimeCost, totalValue) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
                novoEvento.eventDate, novoEvento.eventName, novoEvento.eventLocation, 
                novoEvento.observations, novoEvento.startTime, novoEvento.endTime, 
                novoEvento.totalHours, novoEvento.baseFee, novoEvento.overtimeCost, 
                novoEvento.totalValue
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao salvar evento:', err);
        res.status(500).json({ error: 'Erro ao salvar evento' });
    }
});

// NOVA ROTA PARA APAGAR um evento (DELETE)
app.delete('/api/events/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM events WHERE id = $1', [id]);
        if (result.rowCount > 0) {
            res.status(200).json({ message: 'Evento apagado com sucesso' });
        } else {
            res.status(404).json({ error: 'Evento não encontrado' });
        }
    } catch (err) {
        console.error(`Erro ao apagar evento ${id}:`, err);
        res.status(500).json({ error: 'Erro ao apagar evento' });
    }
});


app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
