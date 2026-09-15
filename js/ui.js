window.SinJeemUI = {
    pages: new Set([
        'page-mode',
        'page-tournament-bracket',
        'page-tournament-match',
        'page-select',
        'page-setup',
        'page-board',
        'page-question',
        'page-answer',
        'page-tournament-result',
        'page-tournament-round',
        'page-result',
        'page-history'
    ]),

    showPage(pageId) {
        this.pages.forEach(id => {
            const page = document.getElementById(id);
            if (page) page.classList.toggle('active', id === pageId);
        });
        const turnBadge = document.getElementById('turn-txt');
        if (turnBadge) {
            turnBadge.classList.toggle('visible', ['page-board', 'page-question', 'page-answer'].includes(pageId));
        }
    },

    setVisible(elementId, visible) {
        const element = document.getElementById(elementId);
        if (element) element.classList.toggle('visible', visible);
    },

    applyHash() {
        const pageId = window.location.hash.slice(1);
        if (this.pages.has(pageId)) this.showPage(pageId);
    }
};

window.addEventListener('DOMContentLoaded', () => window.SinJeemUI.applyHash());
window.addEventListener('hashchange', () => window.SinJeemUI.applyHash());
