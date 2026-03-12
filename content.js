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

// 辅助函数：根据频次获取颜色
function getLobsterColor(count, baseColor = '#ff4500') {
    if (count >= 100) return 'hsl(280, 100%, 50%)'; 
    if (count >= 50) return 'hsl(200, 100%, 50%)';
    
    const minLightness = 30;
    const maxLightness = 60;
    const lightness = Math.max(minLightness, maxLightness - (count * 5));
    return `hsl(0, 100%, ${lightness}%)`;
}

// 给头像戴帽子
async function wearHat(avatarElement, count, isTop1 = false) {
    const storage = await chrome.storage.local.get(['customSvg', 'showCountEnabled', 'baseColor']);
    const svgToUse = storage.customSvg || DEFAULT_LOBSTER_SVG;
    const showCount = storage.showCountEnabled !== false;

    if (avatarElement.querySelector('.lobster-hat-container')) {
        const existingHat = avatarElement.querySelector('.lobster-hat-svg');
        const existingLabel = avatarElement.querySelector('.lobster-count-label');
        
        if (existingHat) {
            existingHat.style.color = getLobsterColor(count, storage.baseColor);
            let filters = ['drop-shadow(0px 3px 2px rgba(0,0,0,0.3))'];
            if (isTop1) filters.push('drop-shadow(0px 0px 8px rgba(255, 215, 0, 0.9))');
            existingHat.style.filter = filters.join(' ');
        }
        
        if (existingLabel) {
            existingLabel.innerText = count;
            existingLabel.style.display = showCount ? 'block' : 'none';
        } else if (showCount) {
            const label = document.createElement('span');
            label.className = 'lobster-count-label';
            label.innerText = count;
            avatarElement.querySelector('.lobster-hat-container').appendChild(label);
        }
        return;
    }

    const container = document.createElement('div');
    container.className = 'lobster-hat-container';
    container.innerHTML = svgToUse;
    
    const svg = container.querySelector('svg');
    if (svg) {
        svg.style.color = getLobsterColor(count, storage.baseColor);
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
    const storage = await chrome.storage.local.get(['counts', 'processedTweets', 'highlightEnabled']);
    const counts = storage.counts || {};
    const processedTweets = storage.processedTweets || [];
    const highlightEnabled = storage.highlightEnabled !== false;

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

    chrome.runtime.sendMessage({ 
        action: "updateBadge", 
        count: foundLobstersCount 
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

// 监听存储变化
chrome.storage.onChanged.addListener((changes) => {
    if (changes.counts && Object.keys(changes.counts.newValue).length === 0) {
        document.querySelectorAll('.lobster-hat-container').forEach(el => el.remove());
    }
});

function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

const debouncedScan = debounce(scanTweets, 200);

const observer = new MutationObserver((mutations) => {
    const hasNewNodes = mutations.some(m => m.addedNodes.length > 0);
    if (hasNewNodes) {
        debouncedScan();
    }
});

observer.observe(document.body, { childList: true, subtree: true });
scanTweets();
