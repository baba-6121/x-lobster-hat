// 监听开关变化
document.getElementById('highlightToggle').onchange = (e) => {
    chrome.storage.local.set({ highlightEnabled: e.target.checked });
};

document.getElementById('badgeToggle').onchange = (e) => {
    chrome.storage.local.set({ badgeEnabled: e.target.checked });
};

document.getElementById('showCountToggle').onchange = (e) => {
    chrome.storage.local.set({ showCountEnabled: e.target.checked });
};

document.getElementById('baseColor').onchange = (e) => {
    chrome.storage.local.set({ baseColor: e.target.value });
};

document.getElementById('svgUpload').onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const svgContent = event.target.result;
            // 简单校验是否包含 <svg
            if (svgContent.includes('<svg')) {
                chrome.storage.local.set({ customSvg: svgContent });
            }
        };
        reader.readAsText(file);
    }
};

// 初始化开关状态
chrome.storage.local.get(['highlightEnabled', 'badgeEnabled', 'showCountEnabled', 'baseColor'], (data) => {
    document.getElementById('highlightToggle').checked = data.highlightEnabled !== false;
    document.getElementById('badgeToggle').checked = data.badgeEnabled !== false;
    document.getElementById('showCountToggle').checked = data.showCountEnabled !== false;
    if (data.baseColor) document.getElementById('baseColor').value = data.baseColor;
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
