window.SinJeemQuestionBank = {
    items: [],
    keys: new Set(),

    normalize(value) {
        return String(value || '')
            .normalize('NFC')
            .toLocaleLowerCase('ar')
            .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
            .replace(/[أإآٱ]/g, 'ا')
            .replace(/ى/g, 'ي')
            .replace(/[\p{P}\p{S}]/gu, '')
            .replace(/\s+/g, ' ')
            .trim();
    },

    questionKey(question) {
        const category = this.normalize(question.category);
        const normalizedQuestion = this.normalize(question.question);
        const imageAnswer = question.image ? `|${this.normalize(question.answer)}` : '';
        return `${category}|${normalizedQuestion}${imageAnswer}`;
    },

    difficulty(value, points) {
        const score = Number(points) || 200;
        if (score <= 200) return 'سهل';
        if (score <= 400) return 'متوسط';
        return 'صعب';
    },

    add(question) {
        const normalized = this.normalize(question.question);
        const key = this.questionKey(question);
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
            imageAlt: question.imageAlt || question.brandName || question.answer,
            image: question.image || '',
            answerImage: question.answerImage || '',
            imageKind: question.imageKind || '',
            source: question.source || '',
            imageSource: question.imageSource || '',
            hint: question.hint || '',
            level: question.level || question.difficulty || '',
            options: Array.isArray(question.options) ? question.options.slice() : [],
            acceptedAnswers: Array.isArray(question.acceptedAnswers)
                ? [...new Set(question.acceptedAnswers.map(answer => String(answer).trim()).filter(Boolean))]
                : [String(question.answer)],
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
