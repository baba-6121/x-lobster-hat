const LOBSTER_SVG = `
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

// 辅助函数：根据频次获取颜色
function getLobsterColor(count) {
    const minLightness = 30; // 最深 (深红)
    const maxLightness = 60; // 最浅 (亮粉红)
    const lightness = Math.max(minLightness, maxLightness - (count * 5));
    return `hsl(0, 100%, ${lightness}%)`;
}

// 给头像戴帽子
function wearHat(avatarElement, count, isTop1 = false) {
    if (avatarElement.querySelector('.lobster-hat-container')) {
        const existingHat = avatarElement.querySelector('.lobster-hat-svg');
        if (existingHat) {
            existingHat.style.color = getLobsterColor(count);
            // 给 Top 1 增加发光效果
            if (isTop1) {
                existingHat.style.filter = 'drop-shadow(0px 0px 5px rgba(255, 215, 0, 0.8)) drop-shadow(0px 3px 2px rgba(0,0,0,0.3))';
            } else {
                existingHat.style.filter = 'drop-shadow(0px 3px 2px rgba(0,0,0,0.3))';
            }
        }
        return;
    }

    const container = document.createElement('div');
    container.className = 'lobster-hat-container';
    container.innerHTML = LOBSTER_SVG;
    
    const svg = container.querySelector('svg');
    svg.style.color = getLobsterColor(count);
    if (isTop1) {
        svg.style.filter = 'drop-shadow(0px 0px 5px rgba(255, 215, 0, 0.8)) drop-shadow(0px 3px 2px rgba(0,0,0,0.3))';
    }
    
    avatarElement.style.position = 'relative';
    avatarElement.appendChild(container);
}

// 扫描推文
async function scanTweets() {
    // 扫描所有可能的推文容器
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    const storage = await chrome.storage.local.get(['counts', 'processedTweets']);
    const counts = storage.counts || {};
    const processedTweets = storage.processedTweets || [];

    // 找出当前的 Top 1 玩家
    const sortedUsers = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top1User = sortedUsers.length > 0 ? sortedUsers[0][0] : null;

    let updated = false;

    // 1. 处理推文中的头像 (Timeline)
    tweets.forEach(tweet => {
        const textNode = tweet.querySelector('[data-testid="tweetText"]');
        const avatarNode = tweet.querySelector('[data-testid="Tweet-User-Avatar"]');
        const timeLink = tweet.querySelector('time')?.parentElement;
        const tweetId = timeLink?.getAttribute('href')?.split('/').pop();

        if (avatarNode) {
            const userLink = tweet.querySelector('a[role="link"][href^="/"]');
            if (userLink) {
                const username = userLink.getAttribute('href').replace('/', '');
                if (tweetId && textNode && textNode.innerText.toLowerCase().includes('openclaw')) {
                    if (!processedTweets.includes(tweetId)) {
                        counts[username] = (counts[username] || 0) + 1;
                        processedTweets.push(tweetId);
                        if (processedTweets.length > 1000) processedTweets.shift();
                        updated = true;
                    }
                }
                if (counts[username] > 0) {
                    wearHat(avatarNode, counts[username], username === top1User);
                }
            }
        }
    });

    // 2. 处理个人主页大头像 (Profile)
    const profileAvatar = document.querySelector('[data-testid="UserProfileHeader_Items"]')?.parentElement?.querySelector('[data-testid^="UserAvatar-Container"]');
    if (profileAvatar) {
        const username = window.location.pathname.replace('/', '');
        if (counts[username] > 0) wearHat(profileAvatar, counts[username], username === top1User);
    }

    // 3. 处理侧边栏头像 (Sidebar / Who to follow)
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
