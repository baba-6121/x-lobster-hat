chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateBadge") {
        const tabId = sender.tab.id;
        chrome.storage.local.get('badgeEnabled', (data) => {
            const badgeEnabled = data.badgeEnabled !== false;
            if (badgeEnabled && request.count > 0) {
                chrome.action.setBadgeText({ 
                    text: request.count.toString(),
                    tabId: tabId
                });
                chrome.action.setBadgeBackgroundColor({ 
                    color: "#ff4500",
                    tabId: tabId
                });
            } else {
                chrome.action.setBadgeText({ 
                    text: "",
                    tabId: tabId
                });
            }
        });
    }
});

// 监听存储变化，如果 badge 被关闭，立即清除当前活跃标签页的图标数字
chrome.storage.onChanged.addListener((changes) => {
    if (changes.badgeEnabled && changes.badgeEnabled.newValue === false) {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.action.setBadgeText({ text: "", tabId: tabs[0].id });
            }
        });
    }
});
