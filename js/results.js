window.SinJeemResults = {
    renderMatch(match, winnerNumber) {
        const rightWinner = winnerNumber === 1;
        const rightBox = document.getElementById('tournament-result-team-a');
        const leftBox = document.getElementById('tournament-result-team-b');
        rightBox.className = `result-team ${rightWinner ? 'winner' : 'loser'}`;
        leftBox.className = `result-team ${rightWinner ? 'loser' : 'winner'}`;
        rightBox.innerHTML = `<strong>${match.right}</strong><span>${rightWinner ? 'متأهل' : 'خرج من البطولة'}</span>`;
        leftBox.innerHTML = `<strong>${match.left}</strong><span>${rightWinner ? 'خرج من البطولة' : 'متأهل'}</span>`;
        document.getElementById('tournament-result-message').innerText = `${rightWinner ? match.right : match.left} تأهل، و${rightWinner ? match.left : match.right} خرج من هذه المرحلة.`;
        document.getElementById('next-tournament-match-btn').innerText = 'المباراة التالية';
    },

    renderRound(round, matches, bracketMarkup) {
        document.getElementById('tournament-round-title').innerText = `نتائج الجولة ${round}`;
        const bracketBox = document.getElementById('tournament-round-bracket');
        bracketBox.innerHTML = `<h3>مخطط البطولة بعد الجولة ${round}</h3><div class="bracket-board">${bracketMarkup}</div>`;
        bracketBox.querySelectorAll('.bracket-team').forEach(button => {
            const teamName = button.textContent.trim();
            const match = matches.find(item => item.right === teamName || item.left === teamName);
            if (match) {
                button.classList.add(match.winner === teamName ? 'selected' : 'eliminated');
                button.disabled = true;
            }
        });
        document.getElementById('tournament-round-summary').innerHTML = matches.map((match, index) => `
            <div class="round-summary-card">
                <h3>المواجهة ${index + 1}</h3>
                <div class="summary-team ${match.winner === match.right ? 'winner' : 'loser'}"><span>${match.right}</span><strong>${match.winner === match.right ? 'متأهل' : 'خاسر'}</strong></div>
                <div class="summary-team ${match.winner === match.left ? 'winner' : 'loser'}"><span>${match.left}</span><strong>${match.winner === match.left ? 'متأهل' : 'خاسر'}</strong></div>
            </div>`).join('');
    },

    renderChampion(title, champion, matches) {
        document.getElementById('result-title').innerText = `${title} - البطل: ${champion}`;
        const matchRows = matches.map((match, index) => `
            <div class="round-summary-card">
                <h3>المواجهة ${index + 1}</h3>
                <div class="summary-team ${match.winner === match.right ? 'winner' : 'loser'}"><span>${match.right}</span><strong>${match.winner === match.right ? 'فاز' : 'خسر'}</strong></div>
                <div class="summary-team ${match.winner === match.left ? 'winner' : 'loser'}"><span>${match.left}</span><strong>${match.winner === match.left ? 'فاز' : 'خسر'}</strong></div>
            </div>`).join('');
        document.getElementById('result-list').innerHTML = `<div class="result-row winner"><span>🏆 ${champion}</span><strong>بطل البطولة</strong></div><div class="round-summary">${matchRows}</div>`;
    },

    renderNormal(title, results) {
        const winner = results[0];
        const winners = results.filter(result => result.score === winner.score);
        document.getElementById('result-title').innerText = winners.length > 1
            ? `تعادل: ${winners.map(result => result.name).join(' و ')}`
            : `الفائز: ${winner.name}`;
        document.getElementById('result-list').innerHTML = results.map((result, index) =>
            `<div class="result-row ${result.score === winner.score ? 'winner' : ''}"><span>${index + 1}. ${result.name}</span><strong>${result.score} نقطة</strong></div>`
        ).join('');
    }
};
