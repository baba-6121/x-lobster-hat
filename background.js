chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateBadge") {
        chrome.storage.local.get('badgeEnabled', (data) => {
            const badgeEnabled = data.badgeEnabled !== false;
            if (badgeEnabled && request.count > 0) {
                chrome.action.setBadgeText({ 
                    text: request.count.toString(),
                    tabId: sender.tab.id 
                });
                chrome.action.setBadgeBackgroundColor({ 
                    color: "#ff4500",
                    tabId: sender.tab.id
                });
            } else {
                chrome.action.setBadgeText({ 
                    text: "",
                    tabId: sender.tab.id
                });
            }
        });
    }
});
