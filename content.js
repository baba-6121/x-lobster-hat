const DEFAULT_LOBSTER_SVG = `
<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg" class="lobster-hat-svg">
    <!-- 龙虾身体/帽子主体 -->
    <path d="M20,45 Q50,5 80,45 Q50,35 20,45" fill="currentColor" />
    <!-- 两个大钳子 -->
    <path d="M15,35 Q-5,20 10,15 Q15,25 20,35" fill="currentColor" />
    <path d="M85,35 Q105,20 90,15 Q85,25 80,35" fill="currentColor" />
    <!-- 触角 -->
    <path d="M40,15 Q35,0 25,5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <path d="M60,15 Q65,0 75,5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <!-- 眼睛 -->
    <circle cx="42" cy="25" r="3" fill="white" />
    <circle cx="42" cy="25" r="1.5" fill="black" />
    <circle cx="58" cy="25" r="3" fill="white" />
    <circle cx="58" cy="25" r="1.5" fill="black" />
</svg>
`;

// 内存缓存：存储当前配置，避免频繁读取 storage
let pluginConfig = {
    customSvg: null,
    showCountEnabled: true,
    baseColor: '#ff4500',
    highlightEnabled: true,
    badgeEnabled: true,
    counts: {},
    processedTweets: []
};

// 初始化与监听配置变化
async function initConfig() {
    const storage = await chrome.storage.local.get(null);
    Object.assign(pluginConfig, storage);
}

chrome.storage.onChanged.addListener((changes) => {
    for (let key in changes) {
        pluginConfig[key] = changes[key].newValue;
    }
    // 如果清空了计数，立即移除页面上的帽子
    if (changes.counts && Object.keys(changes.counts.newValue || {}).length === 0) {
        document.querySelectorAll('.lobster-hat-container').forEach(el => el.remove());
    }
});

// 辅助函数：十六进制转 HSL (用于智能插值)
function hexToHsl(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max == min) { h = s = 0; }
    else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h * 360, s * 100, l * 100];
}

// 辅助函数：根据频次获取颜色 (智能插值版)
function getLobsterColor(count, baseHex) {
    if (count >= 100) return 'hsl(280, 100%, 50%)'; 
    if (count >= 50) return 'hsl(200, 100%, 50%)';
    
    const [h, s, l] = hexToHsl(baseHex || '#ff4500');
    // 频次越高，亮度越低 (变深)，饱和度越高 (变艳)
    const newL = Math.max(20, l - (count * 4));
    const newS = Math.min(100, s + (count * 2));
    return `hsl(${h}, ${newS}%, ${newL}%)`;
}

// 给头像戴帽子 (同步渲染版)
function wearHat(avatarElement, count, isTop1 = false) {
    const svgToUse = pluginConfig.customSvg || DEFAULT_LOBSTER_SVG;
    const showCount = pluginConfig.showCountEnabled !== false;

    if (avatarElement.querySelector('.lobster-hat-container')) {
        const container = avatarElement.querySelector('.lobster-hat-container');
        const existingHat = container.querySelector('.lobster-hat-svg');
        const existingLabel = container.querySelector('.lobster-count-label');
        
        if (existingHat) {
            existingHat.style.color = getLobsterColor(count, pluginConfig.baseColor);
            let filters = ['drop-shadow(0px 3px 2px rgba(0,0,0,0.3))'];
            if (isTop1) filters.push('drop-shadow(0px 0px 8px rgba(255, 215, 0, 0.9))');
            existingHat.style.filter = filters.join(' ');
        }
        
        if (existingLabel) {
            existingLabel.innerText = count;
            existingLabel.style.display = showCount ? 'block' : 'none';
        }
        return;
    }

    const container = document.createElement('div');
    container.className = 'lobster-hat-container';
    container.innerHTML = svgToUse;
    
    const svg = container.querySelector('svg');
    if (svg) {
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.classList.add('lobster-hat-svg');
        svg.style.color = getLobsterColor(count, pluginConfig.baseColor);
        let filters = ['drop-shadow(0px 3px 2px rgba(0,0,0,0.3))'];
        if (isTop1) filters.push('drop-shadow(0px 0px 8px rgba(255, 215, 0, 0.9))');
        svg.style.filter = filters.join(' ');
    }

    if (showCount) {
        const label = document.createElement('span');
        label.className = 'lobster-count-label';
        label.innerText = count;
        container.appendChild(label);
    }
    
    if (count >= 100) {
        avatarElement.classList.add('lobster-mythic-glow');
    } else if (count >= 50) {
        avatarElement.classList.add('lobster-legend-glow');
    }
    
    container.style.animation = 'lobster-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), lobster-float 3s ease-in-out infinite';
    avatarElement.style.position = 'relative';
    avatarElement.appendChild(container);
}

// 扫描推文
async function scanTweets() {
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    const counts = pluginConfig.counts || {};
    const processedTweets = pluginConfig.processedTweets || [];
    const highlightEnabled = pluginConfig.highlightEnabled !== false;

    const sortedUsers = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top1User = sortedUsers.length > 0 ? sortedUsers[0][0] : null;

    let updated = false;
    let foundLobstersCount = 0;

    tweets.forEach(tweet => {
        const textNode = tweet.querySelector('[data-testid="tweetText"]');
        const avatarNode = tweet.querySelector('[data-testid="Tweet-User-Avatar"]');
        const timeLink = tweet.querySelector('time')?.parentElement;
        const tweetId = timeLink?.getAttribute('href')?.split('/').pop();

        if (avatarNode) {
            const userLink = tweet.querySelector('a[role="link"][href^="/"]');
            if (userLink) {
                const username = userLink.getAttribute('href').replace('/', '');
                const keywordRegex = /\b(openclaw|龙虾)\b/i;
                
                if (textNode && keywordRegex.test(textNode.innerText)) {
                    if (tweetId && !processedTweets.includes(tweetId)) {
                        counts[username] = (counts[username] || 0) + 1;
                        processedTweets.push(tweetId);
                        if (processedTweets.length > 1000) processedTweets.shift();
                        updated = true;
                    }

                    if (highlightEnabled && !textNode.querySelector('.lobster-highlight')) {
                        const originalHTML = textNode.innerHTML;
                        const newHTML = originalHTML.replace(
                            new RegExp('(\\bopenclaw\\b|龙虾)', 'gi'),
                            '<span class="lobster-highlight">$1</span>'
                        );
                        if (newHTML !== originalHTML) {
                            textNode.innerHTML = newHTML;
                        }
                    }
                }

                if (counts[username] > 0) {
                    foundLobstersCount++;
                    wearHat(avatarNode, counts[username], username === top1User);
                }
            }
        }
    });

    chrome.runtime.sendMessage({ action: "updateBadge", count: foundLobstersCount });

    const profileAvatar = document.querySelector('[data-testid="UserProfileHeader_Items"]')?.parentElement?.querySelector('[data-testid^="UserAvatar-Container"]');
    if (profileAvatar) {
        const username = window.location.pathname.replace('/', '');
        if (counts[username] > 0) wearHat(profileAvatar, counts[username], username === top1User);
    }

    const sidebarAvatars = document.querySelectorAll('[data-testid="UserCell"] [data-testid^="UserAvatar-Container"]');
    sidebarAvatars.forEach(avatar => {
        const userLink = avatar.closest('[data-testid="UserCell"]')?.querySelector('a[role="link"]');
        if (userLink) {
            const username = userLink.getAttribute('href').replace('/', '');
            if (counts[username] > 0) wearHat(avatar, counts[username], username === top1User);
        }
    });

    if (updated) {
        chrome.storage.local.set({ counts, processedTweets });
    }
}

function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// 启动
initConfig().then(() => {
    const debouncedScan = debounce(scanTweets, 200);
    const observer = new MutationObserver((mutations) => {
        if (mutations.some(m => m.addedNodes.length > 0)) debouncedScan();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    scanTweets();
});
