window.SinJeemQuestionRoundSplit = {
    rounds: ['32', '16', '8', '4', 'final'],

    select(items, targetRound) {
        const groups = new Map();
        for (const item of items) {
            const key = `${item.category}|${item.points}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(item);
        }

        const assignedRounds = new Map();
        for (const group of groups.values()) {
            const counts = new Map(this.rounds.map(round => [round,
                group.filter(item => String(item.round || '') === round).length]));
            const unassigned = group.filter(item => !item.round)
                .sort((left, right) => String(left.id).localeCompare(String(right.id), 'en'));

            for (const item of unassigned) {
                const round = this.rounds.reduce((leastUsed, candidate) =>
                    counts.get(candidate) < counts.get(leastUsed) ? candidate : leastUsed,
                this.rounds[0]);
                assignedRounds.set(item.id, round);
                counts.set(round, counts.get(round) + 1);
            }
        }

        return items.filter(item => (item.category === 'تحدي الصور'
                && (!item.round || String(item.round) === targetRound))
            || String(item.round || assignedRounds.get(item.id)) === targetRound)
            .map(item => ({
                ...item,
                id: item.category === 'تحدي الصور' ? `${item.id}-round${targetRound}` : item.id,
                round: targetRound
            }));
    }
};