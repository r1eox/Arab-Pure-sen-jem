window.SinJeemQuestionBank = {
    items: [],
    keys: new Set(),

    normalize(value) {
        return String(value || '')
            .toLocaleLowerCase('ar')
            .replace(/[؟?!.,،:;"'`]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    },

    difficulty(value, points) {
        const labels = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' };
        return labels[value] || value || (Number(points) === 200 ? 'سهل' : Number(points) === 400 ? 'متوسط' : 'صعب');
    },

    add(question) {
        const normalized = this.normalize(question.question);
        if (!normalized || this.keys.has(normalized)) return false;
        this.keys.add(normalized);
        this.items.push({
            id: question.id || `question-${this.items.length + 1}`,
            category: question.category,
            difficulty: this.difficulty(question.difficulty, question.points),
            points: Number(question.points) || 200,
            question: question.question,
            answer: question.answer,
            image: question.image || '',
            hint: question.hint || ''
        });
        return true;
    },

    addMany(questions) {
        return questions.reduce((report, question) => {
            if (!question || !question.category || !question.question || !question.answer) {
                report.invalid++;
            } else if (this.add(question)) {
                report.added++;
            } else {
                report.duplicates++;
            }
            return report;
        }, { added: 0, duplicates: 0, invalid: 0 });
    },

    find(question, category, answer) {
        const normalized = this.normalize(question);
        return this.items.find(item => this.normalize(item.question) === normalized)
            || this.items.find(item => item.category === category && this.normalize(item.answer) === this.normalize(answer));
    },

    byCategory(category) {
        return this.items.filter(item => item.category === category);
    }
};
