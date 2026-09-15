window.SinJeemQuestion = {
    startTimer(state) {
        clearInterval(state.interval);
        state.running = true;
        document.getElementById('timer-toggle-btn').innerText = '⏸';
        state.interval = setInterval(() => {
            state.seconds++;
            const minutes = String(Math.floor(state.seconds / 60)).padStart(2, '0');
            const seconds = String(state.seconds % 60).padStart(2, '0');
            document.getElementById('timer-display').innerText = `${minutes}:${seconds}`;
        }, 1000);
    },

    toggleTimer(state) {
        if (state.running) {
            clearInterval(state.interval);
            state.running = false;
            document.getElementById('timer-toggle-btn').innerText = '▶';
        } else {
            this.startTimer(state);
        }
    },

    resetTimer(state) {
        clearInterval(state.interval);
        state.seconds = 0;
        state.running = false;
        document.getElementById('timer-display').innerText = '00:00';
        document.getElementById('timer-toggle-btn').innerText = '▶';
    },

    showAnswer(answer, category) {
        clearInterval(window.SinJeemQuestionTimer?.interval);
        document.getElementById('ans-info-text').innerText = category;
        document.getElementById('ans-title').innerText = answer;
    }
};
