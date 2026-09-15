window.SinJeemBoard = {
    pickRandom(items) {
        if (!items.length) return null;
        return items[Math.floor(Math.random() * items.length)];
    },

    populateColumn(column, category, questionBank, usedQuestionIds, difficultyLabel, openQuestion) {
        const categoryQuestions = questionBank.filter(item => item.category === category);
        if (!categoryQuestions.length) return;
        column.querySelectorAll('.score-card-btn').forEach(card => card.remove());
        [200, 400, 600].forEach(points => {
            const pointQuestions = categoryQuestions.filter(item => item.points === points);
            const freshQuestions = pointQuestions.filter(item => !usedQuestionIds.has(item.id));
            const item = this.pickRandom(freshQuestions.length ? freshQuestions : pointQuestions);
            if (item) {
                const card = document.createElement('div');
                card.className = 'score-card-btn';
                card.innerText = item.points;
                card.title = `${difficultyLabel(item.difficulty, item.points)} - ${item.question}`;
                card.addEventListener('click', () => openQuestion(item, card));
                column.appendChild(card);
            }
        });
    },

    reset() {
        document.querySelectorAll('.score-card-btn').forEach(card => card.classList.remove('used'));
        document.querySelectorAll('.side-helper-btn').forEach(helper => helper.classList.remove('used'));
    }
};
