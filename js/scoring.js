window.SinJeemScoring = {
    update(scores) {
        document.getElementById('score-t1').innerText = scores.t1;
        document.getElementById('score-t2').innerText = scores.t2;
        document.getElementById('side-t1-score').innerText = scores.t1;
        document.getElementById('side-t2-score').innerText = scores.t2;
    },

    award(scores, team, points) {
        if (team === 1) scores.t1 += points;
        if (team === 2) scores.t2 += points;
        this.update(scores);
    },

    change(scores, team, value) {
        if (team === 1) scores.t1 = Math.max(0, scores.t1 + value);
        if (team === 2) scores.t2 = Math.max(0, scores.t2 + value);
        this.update(scores);
    }
};
