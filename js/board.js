window.SinJeemBoard = {
    pickRandom(items) {
        if (!items.length) return null;
        return items[Math.floor(Math.random() * items.length)];
    },

    readLegacyQuestions(column, category) {
        return Array.from(column.querySelectorAll('.score-card-btn')).map((card, index) => {
            const source = card.getAttribute('onclick') || '';
            const match = source.match(/openQ\('([^']*)', '([^']*)', '([^']*)', '([^']*)', '([^']*)', this, (\d+)\)/);
            if (!match) return null;
            return {
                id: `legacy-${category}-${index}`,
                category: match[1],
                difficulty: match[2],
                question: match[3],
                answer: match[4],
                image: match[5],
                points: Number(match[6]),
                hint: ''
            };
        }).filter(Boolean);
    },

    populateColumn(column, category, questionBank, usedQuestionIds, difficultyLabel, openQuestion) {
        const categoryQuestions = questionBank.filter(item => item.category === category);
        const availableQuestions = categoryQuestions.length ? categoryQuestions : this.readLegacyQuestions(column, category);
        if (!availableQuestions.length) return;
        column.querySelectorAll('.score-card-btn').forEach(card => card.remove());
        [100, 200, 300, 400, 500].forEach(points => {
            const freshQuestions = availableQuestions.filter(item => !usedQuestionIds.has(item.id));
            const item = this.pickRandom(freshQuestions.length ? freshQuestions : availableQuestions);
            if (item) {
                const card = document.createElement('div');
                card.className = 'score-card-btn';
                card.innerText = points;
                card.title = `${difficultyLabel(item.difficulty, points)} - ${item.question}`;
                card.addEventListener('click', () => openQuestion({ ...item, points }, card));
                column.appendChild(card);
            }
        });
    },

    reset() {
        document.querySelectorAll('.score-card-btn').forEach(card => card.classList.remove('used'));
        document.querySelectorAll('.side-helper-btn').forEach(helper => helper.classList.remove('used'));
    }
};
