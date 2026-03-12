// 监听开关变化
document.getElementById('highlightToggle').onchange = (e) => {
    chrome.storage.local.set({ highlightEnabled: e.target.checked });
};

document.getElementById('badgeToggle').onchange = (e) => {
    chrome.storage.local.set({ badgeEnabled: e.target.checked });
};

// 初始化开关状态
chrome.storage.local.get(['highlightEnabled', 'badgeEnabled'], (data) => {
    document.getElementById('highlightToggle').checked = data.highlightEnabled !== false;
    document.getElementById('badgeToggle').checked = data.badgeEnabled !== false;
});

async function updateStats() {
    const storage = await chrome.storage.local.get('counts');
    const counts = storage.counts || {};
    const statsDiv = document.getElementById('stats');
    
    if (Object.keys(counts).length === 0) {
        statsDiv.innerText = "No lobsters yet!";
        return;
    }

    statsDiv.innerHTML = sortedEntries
        .map(([user, count], index) => {
            const isTop1 = index === 0;
            return `
                <div class="count-item ${isTop1 ? 'top-1' : ''}">
                    <span class="user-link" data-user="${user}">${isTop1 ? '<span class="crown">👑</span>' : ''}@${user}</span>
                    <span class="lobster-count">${count} 🦞</span>
                </div>
            `;
        })
        .join('');

    // 点击用户名跳转
    document.querySelectorAll('.user-link').forEach(el => {
        el.onclick = () => {
            const user = el.getAttribute('data-user');
            chrome.tabs.create({ url: `https://x.com/${user}` });
        };
    });
}

document.getElementById('share').onclick = async () => {
    const storage = await chrome.storage.local.get('counts');
    const counts = storage.counts || {};
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    
    let text = "My X Lobster Leaderboard! 🦞✨\n\n";
    if (sorted.length > 0) {
        text += `👑 King: @${sorted[0][0]} (${sorted[0][1]} lobsters)\n`;
        if (sorted.length > 1) text += `🥈 @${sorted[1][0]} (${sorted[1][1]})\n`;
    }
    text += "\nInstall Lobster Hat to join the fun! #OpenClaw #LobsterHat";
    
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    chrome.tabs.create({ url });
};

document.getElementById('clear').onclick = async () => {
    await chrome.storage.local.set({ counts: {}, processedTweets: [] });
    updateStats();
};

updateStats();
