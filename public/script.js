// server.js
const express = require('express');
const path = require('path');
const { Pool } = require('pg'); // Importa a ferramenta para conectar com o PostgreSQL

const app = express();
const PORT = process.env.PORT || 3000; // Usa a porta do ambiente ou 3000

// Configuração da conexão com o banco de dados PostgreSQL do Render
// A DATABASE_URL será fornecida pelo próprio Render.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota para BUSCAR os eventos do banco de dados
app.get('/api/events', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM events ORDER BY eventDate');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar eventos' });
    }
});

// Rota para ADICIONAR um evento no banco de dados
app.post('/api/events', async (req, res) => {
    const novoEvento = req.body;
    console.log('Recebido novo evento para salvar:', novoEvento);
    
    try {
        const result = await pool.query(
            `INSERT INTO events (eventDate, eventName, eventLocation, observations, startTime, endTime, totalHours, baseFee, overtimeCost, totalValue) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [
                novoEvento.eventDate, novoEvento.eventName, novoEvento.eventLocation, 
                novoEvento.observations, novoEvento.startTime, novoEvento.endTime, 
                novoEvento.totalHours, novoEvento.baseFee, novoEvento.overtimeCost, 
                novoEvento.totalValue
            ]
        );
        res.status(201).json({ message: 'Evento adicionado com sucesso!', id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao salvar evento' });
    }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
