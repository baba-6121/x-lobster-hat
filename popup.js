async function updateStats() {
    const storage = await chrome.storage.local.get('counts');
    const counts = storage.counts || {};
    const statsDiv = document.getElementById('stats');
    
    if (Object.keys(counts).length === 0) {
        statsDiv.innerText = "No lobsters yet!";
        return;
    }

    statsDiv.innerHTML = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([user, count]) => `<div class="count-item"><span>@${user}</span> <span>${count} 🦞</span></div>`)
        .join('');
}

document.getElementById('clear').onclick = async () => {
    await chrome.storage.local.set({ counts: {}, processedTweets: [] });
    updateStats();
};

updateStats();
