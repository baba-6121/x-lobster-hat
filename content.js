const LOBSTER_SVG = `
<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg" class="lobster-hat-svg">
    <!-- 简易龙虾帽 SVG 路径 -->
    <path d="M20,40 Q50,10 80,40 L75,45 Q50,20 25,45 Z" fill="currentColor" />
    <circle cx="35" cy="30" r="3" fill="black" />
    <circle cx="65" cy="30" r="3" fill="black" />
    <path d="M10,35 Q5,25 15,20 T25,25" fill="none" stroke="currentColor" stroke-width="2" />
    <path d="M90,35 Q95,25 85,20 T75,25" fill="none" stroke="currentColor" stroke-width="2" />
</svg>
`;

// 辅助函数：根据频次获取颜色
function getLobsterColor(count) {
    const minLightness = 30; // 最深 (深红)
    const maxLightness = 60; // 最浅 (亮粉红)
    const lightness = Math.max(minLightness, maxLightness - (count * 5));
    return `hsl(0, 100%, ${lightness}%)`;
}

// 给头像戴帽子
function wearHat(avatarElement, count) {
    if (avatarElement.querySelector('.lobster-hat-container')) {
        const existingHat = avatarElement.querySelector('.lobster-hat-svg');
        if (existingHat) existingHat.style.color = getLobsterColor(count);
        return;
    }

    const container = document.createElement('div');
    container.className = 'lobster-hat-container';
    container.innerHTML = LOBSTER_SVG;
    
    const svg = container.querySelector('svg');
    svg.style.color = getLobsterColor(count);
    
    avatarElement.style.position = 'relative';
    avatarElement.appendChild(container);
}

// 扫描推文
async function scanTweets() {
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    const storage = await chrome.storage.local.get(['counts', 'processedTweets']);
    const counts = storage.counts || {};
    const processedTweets = storage.processedTweets || []; // 存储已统计过的推文 ID

    let updated = false;

    tweets.forEach(tweet => {
        const textNode = tweet.querySelector('[data-testid="tweetText"]');
        const avatarNode = tweet.querySelector('[data-testid="Tweet-User-Avatar"]');
        
        // 尝试获取推文唯一 ID (通常在时间的链接里)
        const timeLink = tweet.querySelector('time')?.parentElement;
        const tweetId = timeLink?.getAttribute('href')?.split('/').pop();

        if (avatarNode) {
            const userLink = tweet.querySelector('a[role="link"][href^="/"]');
            if (userLink) {
                const username = userLink.getAttribute('href').replace('/', '');
                
                // 1. 如果当前推文包含关键词，且该推文 ID 没被处理过
                if (tweetId && textNode && textNode.innerText.toLowerCase().includes('openclaw')) {
                    if (!processedTweets.includes(tweetId)) {
                        counts[username] = (counts[username] || 0) + 1;
                        processedTweets.push(tweetId);
                        // 保持记录不要无限膨胀，只保留最近 1000 条
                        if (processedTweets.length > 1000) processedTweets.shift();
                        updated = true;
                    }
                }

                // 2. 只要该用户在历史记录中有计数，就显示帽子
                if (counts[username] > 0) {
                    wearHat(avatarNode, counts[username]);
                }
            }
        }
    });

    if (updated) {
        chrome.storage.local.set({ counts, processedTweets });
    }
}

// 监听存储变化（如点击清除按钮）
chrome.storage.onChanged.addListener((changes) => {
    if (changes.counts && Object.keys(changes.counts.newValue).length === 0) {
        // 清除所有帽子
        document.querySelectorAll('.lobster-hat-container').forEach(el => el.remove());
    }
});

// 监听动态加载
const observer = new MutationObserver(() => {
    scanTweets();
});

observer.observe(document.body, { childList: true, subtree: true });
scanTweets();
