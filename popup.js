// 内存缓存
let pluginConfig = {
    counts: {},
    leaderboardTitle: "Leaderboard",
    shareKing: "Share King 👑",
    settingsBtn: "Settings",
    noLobsters: "No lobsters yet! 🦞",
    shareText: "My X Lobster Leaderboard! 🦞✨\n\n👑 King: @$KING$ ($COUNT$ lobsters)\n\nInstall Lobster Hat to join the fun! #OpenClaw #LobsterHat",
    languageOverride: 'auto'
};

// 加载指定语言包
async function fetchI18nMessages(lang) {
    const response = await fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`));
    return await response.json();
}

// 映射消息
function mapMessages(dict) {
    return {
        leaderboardTitle: dict.leaderboardTitle.message,
        shareKing: dict.shareKing.message,
        settingsBtn: dict.settingsBtn.message,
        noLobsters: dict.noLobsters.message,
        shareText: dict.shareText.message
    };
}

async function initPopup() {
    const storage = await chrome.storage.local.get(['counts', 'languageOverride']);
    const lang = storage.languageOverride || 'auto';
    
    let msgs = {};
    if (lang === 'auto') {
        msgs = {
            leaderboardTitle: chrome.i18n.getMessage("leaderboardTitle"),
            shareKing: chrome.i18n.getMessage("shareKing"),
            settingsBtn: chrome.i18n.getMessage("settingsBtn"),
            noLobsters: chrome.i18n.getMessage("noLobsters"),
            shareText: chrome.i18n.getMessage("shareText")
        };
    } else {
        const dict = await fetchI18nMessages(lang);
        msgs = mapMessages(dict);
    }
    
    Object.assign(pluginConfig, storage, msgs);

    document.getElementById('title').innerText = pluginConfig.leaderboardTitle;
    document.getElementById('share').innerText = pluginConfig.shareKing;
    document.getElementById('options').innerText = pluginConfig.settingsBtn;

    updateStats();
}

async function updateStats() {
    const counts = pluginConfig.counts || {};
    const statsDiv = document.getElementById('stats');
    
    const entries = Object.entries(counts);
    if (entries.length === 0) {
        statsDiv.innerHTML = `<div style="padding: 20px; text-align: center; color: #536471;">${pluginConfig.noLobsters}</div>`;
        return;
    }

    const sortedEntries = entries.sort((a, b) => b[1] - a[1]);

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

    document.querySelectorAll('.user-link').forEach(el => {
        el.onclick = () => {
            const user = el.getAttribute('data-user');
            chrome.tabs.create({ url: `https://x.com/${user}` });
        };
    });
}

document.getElementById('share').onclick = async () => {
    const counts = pluginConfig.counts || {};
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    
    let text = "";
    if (sorted.length > 0) {
        text = pluginConfig.shareText
            .replace('$KING$', sorted[0][0])
            .replace('$COUNT$', sorted[0][1]);
    } else {
        text = "My X Lobster Leaderboard! 🦞✨ #OpenClaw #LobsterHat";
    }
    
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    chrome.tabs.create({ url });
};

document.getElementById('options').onclick = () => {
    chrome.runtime.openOptionsPage();
};

initPopup();
