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
        const score = Number(points) || 200;
        if (score <= 200) return 'سهل';
        if (score <= 400) return 'متوسط';
        return 'صعب';
    },

    add(question) {
        const normalized = this.normalize(question.question);
        const key = question.image ? `${normalized}|${this.normalize(question.answer)}` : normalized;
        if (!normalized || this.keys.has(key)) return false;
        this.keys.add(key);
        this.items.push({
            id: question.id || `question-${this.items.length + 1}`,
            category: question.category,
            difficulty: this.difficulty(question.difficulty, question.points),
            points: Number(question.points) || 200,
            question: question.question,
            answer: question.answer,
            brandName: question.brandName || question.answer,
            image: question.image || '',
            hint: question.hint || '',
            level: question.level || question.difficulty || '',
            options: Array.isArray(question.options) ? question.options.slice() : [],
            region: question.region || ''
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
        const normalizedAnswer = this.normalize(answer);
        return this.items.find(item => item.category === category
            && this.normalize(item.question) === normalized
            && this.normalize(item.answer) === normalizedAnswer)
            || this.items.find(item => this.normalize(item.question) === normalized)
            || this.items.find(item => item.category === category && this.normalize(item.answer) === normalizedAnswer);
    },

    byCategory(category) {
        return this.items.filter(item => item.category === category);
    }
};
