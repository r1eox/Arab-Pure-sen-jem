window.SinJeemBoard = {
    legacyQuestionCache: new Map(),

    pickRandom(items) {
        if (!items.length) return null;
        return items[Math.floor(Math.random() * items.length)];
    },

    readLegacyQuestions(column, category) {
        if (this.legacyQuestionCache.has(category)) return this.legacyQuestionCache.get(category);
        const questions = Array.from(column.querySelectorAll('.score-card-btn')).map((card, index) => {
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
        this.legacyQuestionCache.set(category, questions);
        return questions;
    },

    populateColumn(column, category, questionBank, usedQuestionIds, difficultyLabel, openQuestion) {
        const categoryQuestions = questionBank.filter(item => item.category === category);
        const legacyQuestions = categoryQuestions.length ? [] : this.readLegacyQuestions(column, category);
        const availableQuestions = categoryQuestions.length ? categoryQuestions : legacyQuestions;
        column.querySelectorAll('.score-card-btn').forEach(card => card.remove());
        if (!availableQuestions.length) return;
        const usedInColumn = new Set();
        [100, 200, 300, 400, 500].forEach(points => {
            const freshQuestions = availableQuestions.filter(item =>
                !usedQuestionIds.has(item.id) && !usedInColumn.has(item.id));
            const unusedQuestions = availableQuestions.filter(item => !usedInColumn.has(item.id));
            const candidates = freshQuestions.length
                ? freshQuestions
                : unusedQuestions.length ? unusedQuestions : availableQuestions;
            const closestDistance = Math.min(...candidates.map(item => Math.abs(Number(item.points) - points)));
            const closestQuestions = candidates.filter(item => Math.abs(Number(item.points) - points) === closestDistance);
            const item = this.pickRandom(closestQuestions);
            if (item) {
                usedInColumn.add(item.id);
                const card = document.createElement('div');
                card.className = 'score-card-btn';
                card.innerText = points;
                card.title = `${difficultyLabel(item.difficulty, points)} - ${item.question}`;
                card.addEventListener('click', () => openQuestion({
                    ...item,
                    points,
                    difficulty: difficultyLabel(item.difficulty, points)
                }, card));
                column.appendChild(card);
            }
        });
    },

    reset() {
        document.querySelectorAll('.score-card-btn').forEach(card => card.classList.remove('used'));
        document.querySelectorAll('.side-helper-btn').forEach(helper => helper.classList.remove('used'));
    }
};
