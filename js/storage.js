window.SinJeemStorage = {
    key: 'sinJeemHistory',

    readHistory() {
        try {
            return JSON.parse(localStorage.getItem(this.key) || '[]');
        } catch (error) {
            return [];
        }
    },

    saveMatch(match) {
        const history = this.readHistory();
        history.unshift(match);
        localStorage.setItem(this.key, JSON.stringify(history.slice(0, 30)));
    },

    clear() {
        localStorage.removeItem(this.key);
    }
};
