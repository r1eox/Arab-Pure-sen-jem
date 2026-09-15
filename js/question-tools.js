window.SinJeemQuestionTools = {
    resetHint() {
        const hintBox = document.getElementById('inline-hint');
        if (!hintBox) return;
        hintBox.classList.remove('visible');
        hintBox.innerText = '';
    },

    showHint(hint) {
        const hintBox = document.getElementById('inline-hint');
        if (!hintBox) return;
        hintBox.innerText = `تلميح: ${hint}`;
        hintBox.classList.add('visible');
    },

    setDoublePoints(points) {
        const pointsBadge = document.getElementById('q-pts-badge');
        if (pointsBadge) pointsBadge.innerText = `${points * 2} نقطة (مضاعفة)`;
    }
};
