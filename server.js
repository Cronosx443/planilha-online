// server.js

const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// IMPORTANTE: Linha nova que ensina o servidor a entender JSON
app.use(express.json());

const eventosSalvos = [
    { eventDate: '2025-07-25T00:00:00.000Z', eventName: 'Evento de Exemplo 1', eventLocation: 'Online', observations: 'Este é um evento carregado do servidor.', startTime: '10:00', endTime: '18:00', totalHours: '8.00', baseFee: '500.00', overtimeCost: '0.00', totalValue: 500.00 },
    { eventDate: '2025-07-26T00:00:00.000Z', eventName: 'Evento de Exemplo 2', eventLocation: 'Buffet Central', observations: 'Outro evento para teste.', startTime: '09:00', endTime: '23:00', totalHours: '14.00', baseFee: '1000.00', overtimeCost: '166.67', totalValue: 1166.67 }
];

app.use(express.static(path.join(__dirname, 'public')));

// Rota para BUSCAR os eventos (GET)
app.get('/api/events', (req, res) => {
    res.json(eventosSalvos);
});

// NOVA ROTA PARA ADICIONAR um evento (POST)
app.post('/api/events', (req, res) => {
    const novoEvento = req.body; // Pega o novo evento que o navegador enviou
    console.log('Recebido novo evento para salvar:', novoEvento);
    
    eventosSalvos.push(novoEvento); // Adiciona o novo evento na nossa lista em memória
    
    res.status(201).json({ message: 'Evento adicionado com sucesso!', evento: novoEvento });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}. Acesse em http://localhost:${PORT}`);
});
