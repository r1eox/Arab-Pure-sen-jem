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
        for (const points of [100, 200, 300, 400, 500]) {
            const levelQuestions = availableQuestions.filter(item =>
                Number(item.points) === points && !usedInColumn.has(item.id));
            if (!levelQuestions.length) continue;
            let candidates = levelQuestions.filter(item => !usedQuestionIds.has(item.id));
            if (!candidates.length) {
                levelQuestions.forEach(item => usedQuestionIds.delete(item.id));
                candidates = levelQuestions;
                try {
                    localStorage.setItem('sinJeemUsedQuestionIds', JSON.stringify([...usedQuestionIds]));
                } catch (error) {
                    console.warn('تعذر بدء دورة جديدة لمستوى الأسئلة.', error);
                }
            }
            if (!candidates.length) break;
            let closestQuestions = candidates;
            if (points >= 300 && category !== 'كورة ورياضة') {
                const sourcedQuestions = candidates.filter(item => item.image
                    && item.imageKind !== 'illustration');
                if (sourcedQuestions.length) {
                    closestQuestions = sourcedQuestions;
                }
            }
            if (category === 'شعارات') {
                const preferredRegion = points === 500 ? 'international' : 'arab';
                const preferredQuestions = closestQuestions.filter(item => item.region === preferredRegion);
                if (preferredQuestions.length) closestQuestions = preferredQuestions;
            }
            const item = this.pickRandom(closestQuestions);
            if (item) {
                usedInColumn.add(item.id);
                const question = {
                    ...item,
                    points,
                    difficulty: difficultyLabel(item.difficulty, points)
                };
                const card = document.createElement('div');
                card.className = 'score-card-btn';
                card.innerText = points;
                card.dataset.questionId = item.id;
                card.dataset.questionData = JSON.stringify(question);
                card.title = `${question.difficulty} - ${item.question}`;
                card.addEventListener('click', () => openQuestion(question, card));
                column.appendChild(card);
            }
        }
    },

    restoreColumn(column, savedCards, openQuestion) {
        column.querySelectorAll('.score-card-btn').forEach(card => card.remove());
        savedCards.forEach(savedCard => {
            const question = savedCard.question;
            if (!question) return;
            const card = document.createElement('div');
            card.className = 'score-card-btn';
            card.innerText = question.points;
            card.title = `${question.difficulty} - ${question.question}`;
            card.dataset.questionId = question.id || '';
            card.dataset.questionData = JSON.stringify(question);
            if (savedCard.used) card.classList.add('used');
            card.addEventListener('click', () => openQuestion(question, card));
            column.appendChild(card);
        });
    },

    reset() {
        document.querySelectorAll('.score-card-btn').forEach(card => card.classList.remove('used'));
        document.querySelectorAll('.side-helper-btn').forEach(helper => helper.classList.remove('used'));
    }
};
