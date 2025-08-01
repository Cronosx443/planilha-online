document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Carregado. Configurando listeners.");
    loadUserData();
    loadEvents();
    
    document.getElementById('addEventBtn').addEventListener('click', addEvent);
    document.getElementById('generatePdfBtn').addEventListener('click', handleGenerateReport);
    document.getElementById('createReminderBtn').addEventListener('click', handleCreateReminder);
    document.getElementById('prepareEmailBtn').addEventListener('click', handlePrepareEmail);

    const userFields = ['userName', 'userCpf', 'userPix', 'userBank', 'userAgency', 'userAccount'];
    userFields.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input) {
            input.addEventListener('blur', saveUserData);
        }
    });
});

function saveUserData() {
    const userData = {
        name: document.getElementById('userName').value, cpf: document.getElementById('userCpf').value,
        pix: document.getElementById('userPix').value, bank: document.getElementById('userBank').value,
        agency: document.getElementById('userAgency').value, account: document.getElementById('userAccount').value,
    };
    localStorage.setItem('planilhaUserData', JSON.stringify(userData));
}

function loadUserData() {
    const savedData = localStorage.getItem('planilhaUserData');
    if (savedData) {
        const userData = JSON.parse(savedData);
        document.getElementById('userName').value = userData.name || '';
        document.getElementById('userCpf').value = userData.cpf || '';
        document.getElementById('userPix').value = userData.pix || '';
        document.getElementById('userBank').value = userData.bank || '';
        document.getElementById('userAgency').value = userData.agency || '';
        document.getElementById('userAccount').value = userData.account || '';
    }
}

function renderTable(events) {
    const tableBody = document.getElementById('eventsTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; 
    events.sort((a, b) => new Date(a.eventdate) - new Date(b.eventdate));
    events.forEach(eventData => {
        const newRow = tableBody.insertRow();
        const eventDateForDataset = new Date(eventData.eventdate).toISOString().split('T')[0];
        newRow.dataset.rawDate = eventDateForDataset;
        newRow.dataset.eventData = JSON.stringify(eventData);
        newRow.innerHTML = `
            <td><input type="checkbox" class="event-checkbox"></td>
            <td>${new Date(eventData.eventdate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
            <td>${eventData.eventname}</td>
            <td>${eventData.eventlocation}</td>
            <td>${eventData.observations}</td>
            <td><strong>R$ ${Number(eventData.totalvalue).toFixed(2)}</strong></td>
            <td class="no-print"><button class="delete-btn" onclick="deleteRow(${eventData.id})">Apagar</button></td>
        `;
    });
}

async function loadEvents() {
    try {
        const response = await fetch('/api/events');
        if (!response.ok) throw new Error('Falha na resposta do servidor');
        const events = await response.json();
        renderTable(events);
    } catch (error) {
        console.error("Erro ao buscar eventos:", error);
        alert("Não foi possível carregar os eventos do servidor.");
    }
}

async function addEvent() {
    console.log("Botão 'Adicionar Evento' clicado. Iniciando função addEvent.");
    const eventDate = document.getElementById('eventDate').value;
    if (Array.from(document.querySelectorAll('#eventsTable tbody tr')).some(row => row.dataset.rawDate === eventDate)) {
        alert('Aviso: Já existe um evento registrado para esta data.');
        return;
    }
    const eventName = document.getElementById('eventName').value;
    const eventLocation = document.getElementById('eventLocation').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const baseFee = parseFloat(document.getElementById('baseFee').value);
    const observations = document.getElementById('observations').value;
    if (!eventDate || !eventName || !startTime || !endTime || isNaN(baseFee) || baseFee <= 0) {
        alert('Erro: Verifique se todos os campos obrigatórios foram preenchidos corretamente.');
        return;
    }

    const startDateTime = new Date(`${eventDate}T${startTime}`);
    let endDateTime = new Date(`${eventDate}T${endTime}`);
    if (endDateTime <= startDateTime) { endDateTime.setDate(endDateTime.getDate() + 1); }
    const totalHours = (endDateTime - startDateTime) / (1000 * 60 * 60);
    let overtimeCost = 0;
    if (totalHours > 12) { overtimeCost = (totalHours - 12) * (baseFee / 12); }
    const totalValue = baseFee + overtimeCost;
    
    const novoEvento = {
        eventDate: new Date(eventDate + 'T00:00:00Z'), eventName,
        eventLocation: eventLocation || '-', observations: observations || '-',
        startTime, endTime, totalHours: totalHours.toFixed(2), baseFee: baseFee.toFixed(2),
        overtimeCost: overtimeCost.toFixed(2), totalValue
    };
    console.log("Enviando novo evento para o servidor:", novoEvento);

    try {
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoEvento)
        });
        console.log("Resposta do servidor recebida:", response);
        if (response.ok) {
            console.log("Evento salvo com sucesso! Recarregando a lista.");
            document.getElementById('addEventForm').reset();
            loadEvents();
        } else {
            const errorData = await response.json();
            console.error("Erro do servidor:", errorData);
            alert("Ocorreu um erro ao salvar o evento no servidor.");
        }
    } catch (error) {
        console.error("Erro de rede ao tentar salvar evento:", error);
        alert("Erro de conexão. Não foi possível salvar o evento.");
    }
}

async function deleteRow(id) {
    console.log(`Tentando apagar evento com ID: ${id}`);
    if (confirm('Tem certeza que deseja apagar este evento PERMANENTEMENTE?')) {
        try {
            const response = await fetch(`/api/events/${id}`, {
                method: 'DELETE'
            });
            console.log('Resposta do servidor para apagar:', response);
            if (response.ok) {
                console.log("Evento apagado com sucesso! Recarregando a lista.");
                loadEvents();
            } else {
                alert('Erro ao apagar o evento no servidor.');
            }
        } catch (error) {
            console.error("Erro de rede ao tentar apagar evento:", error);
            alert('Erro de conexão. Não foi possível apagar o evento.');
        }
    }
}

function getSelectedData() {
    const userData = {
        name: document.getElementById('userName').value, cpf: document.getElementById('userCpf').value,
        pix: document.getElementById('userPix').value, bank: document.getElementById('userBank').value,
        agency: document.getElementById('userAgency').value, account: document.getElementById('userAccount').value,
    };
    if (!userData.name || !userData.cpf) { alert('Por favor, preencha seu Nome Completo e CPF.'); return null; }
    if (!userData.pix && (!userData.bank || !userData.agency || !userData.account)) {
        alert('Preencha a Chave PIX ou os dados bancários completos.'); return null;
    }
    const selectedRows = document.querySelectorAll('.event-checkbox:checked');
    if (selectedRows.length === 0) { alert('Nenhum evento selecionado.'); return null; }
    
    let totalSum = 0;
    let eventsData = [];
    let lastEventDate = null;
    selectedRows.forEach(checkbox => {
        const rowData = JSON.parse(checkbox.closest('tr').dataset.eventData);
        totalSum += rowData.totalvalue;
        eventsData.push(rowData);
        const currentEventDate = new Date(rowData.eventdate);
        if (!lastEventDate || currentEventDate > lastEventDate) { lastEventDate = currentEventDate; }
    });
    return { userData, totalSum, eventsData, lastEventDate };
}

function handleGenerateReport() {
    const data = getSelectedData();
    if (!data) return;
    const printArea = document.getElementById('print-area');
    const reportRowsHtml = data.eventsData.map(e => `
        <tr>
            <td style="border: 1px solid #ddd; padding: 5px;">${new Date(e.eventdate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
            <td style="border: 1px solid #ddd; padding: 5px;">${e.eventname}</td>
            <td style="border: 1px solid #ddd; padding: 5px;">${e.eventlocation}</td>
            <td style="border: 1px solid #ddd; padding: 5px;">${e.observations}</td>
            <td style="border: 1px solid #ddd; padding: 5px; text-align: center;">${e.starttime}</td>
            <td style="border: 1px solid #ddd; padding: 5px; text-align: center;">${e.endtime}</td>
            <td style="border: 1px solid #ddd; padding: 5px; text-align: right;">${e.totalhours}h</td>
            <td style="border: 1px solid #ddd; padding: 5px; text-align: right;">R$ ${e.basefee}</td>
            <td style="border: 1px solid #ddd; padding: 5px; text-align: right;">R$ ${e.overtimecost}</td>
            <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-weight: bold;">R$ ${Number(e.totalvalue).toFixed(2)}</td>
        </tr>`).join('');
    let paymentInfoHtml = `<p><strong>Chave PIX:</strong> ${data.userData.pix}</p>`;
    if (data.userData.bank && data.userData.agency && data.userData.account) {
        paymentInfoHtml += `<p><strong>Opção TED/DOC:</strong> Banco ${data.userData.bank} | Agência: ${data.userData.agency} | Conta: ${data.userData.account}</p>`;
    }
    const tableHeaderStyle = 'background-color: #34495e; color: white; border: 1px solid #34495e; padding: 6px; text-align: left;';
    printArea.innerHTML = `
        <div style="font-family: Arial, sans-serif; margin: 20px;">
            <h2>Relatório de Serviços Prestados</h2><p><strong>Profissional:</strong> ${data.userData.name}</p>
            <p><strong>CPF:</strong> ${data.userData.cpf}</p><p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p><hr>
            <div style="background-color:#f0f2f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; border: 1px solid #e1e5e8;">
                <h4 style="margin-top:0; color:#2c3e50;">Dados para Pagamento</h4>${paymentInfoHtml}</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead><tr>
                    <th style="${tableHeaderStyle}">Data</th><th style="${tableHeaderStyle}">Evento</th><th style="${tableHeaderStyle}">Local</th>
                    <th style="${tableHeaderStyle}">Observação</th><th style="${tableHeaderStyle}; text-align: center;">Entrada</th>
                    <th style="${tableHeaderStyle}; text-align: center;">Saída</th><th style="${tableHeaderStyle}; text-align: right;">Duração</th>
                    <th style="${tableHeaderStyle}; text-align: right;">Cachê (R$)</th><th style="${tableHeaderStyle}; text-align: right;">Extra (R$)</th>
                    <th style="${tableHeaderStyle}; text-align: right;">Total (R$)</th>
                </tr></thead>
                <tbody>${reportRowsHtml}</tbody>
                <tfoot><tr>
                    <td colspan="9" style="border: 1px solid #ddd; padding: 5px; text-align: right; font-weight: bold;">TOTAL GERAL</td>
                    <td style="border: 1px solid #ddd; padding: 5px; background-color: #d5f5e3; text-align: right; font-weight: bold;">R$ ${data.totalSum.toFixed(2)}</td>
                </tr></tfoot>
            </table>
        </div>`;
    window.print();
}

function handleCreateReminder() {
    const data = getSelectedData();
    if (!data) return;
    const endDate = data.lastEventDate;
    const endDay = endDate.getDate();
    let paymentDate = new Date(endDate);
    if (endDay <= 15) { paymentDate.setDate(25); } else {
        paymentDate.setMonth(paymentDate.getMonth() + 1);
        paymentDate.setDate(10);
    }
    const year = paymentDate.getFullYear();
    const month = String(paymentDate.getMonth() + 1).padStart(2, '0');
    const day = String(paymentDate.getDate()).padStart(2, '0');
    const googleDate = `${year}${month}${day}`;
    const eventTitle = `Lembrete: Receber Pagamento de R$ ${data.totalSum.toFixed(2)}`;
    const eventDetails = `Lembrete para receber o pagamento referente aos eventos faturados. Valor total: R$ ${data.totalSum.toFixed(2)}.`;
    const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${googleDate}/${googleDate}&details=${encodeURIComponent(eventDetails)}&sf=true&output=xml`;
    window.open(googleCalendarUrl, '_blank');
}

function handlePrepareEmail() {
    const data = getSelectedData();
    if (!data) return;
    const eventDetailsForEmail = data.eventsData.map(e => {
        let detail = `- ${e.eventname} (${new Date(e.eventdate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}) (R$ ${Number(e.totalvalue).toFixed(2)})`;
        if (e.observations && e.observations !== '-') { detail += ` | Obs: ${e.observations}`; }
        return detail;
    });
    const emailBody = `Olá,\n\nReferente aos serviços prestados no período.\n\nResumo dos eventos:\n${eventDetailsForEmail.join('\n')}\n\nO valor total para pagamento é de R$ ${data.totalSum.toFixed(2)}.\n\n--- Dados para Pagamento ---\nPIX: ${data.userData.pix}\nBanco: ${data.userData.bank}\nAgência: ${data.userData.agency}\nConta: ${data.userData.account}\n\nAtenciosamente,\n${data.userData.name}\nCPF: ${data.userData.cpf}`;
    const mailtoLink = `mailto:?subject=${encodeURIComponent('Cobrança de Serviços Prestados')}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;
}
