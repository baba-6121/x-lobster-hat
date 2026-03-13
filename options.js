function showToast() {
    const toast = document.getElementById('toast');
    toast.innerText = getI18nMsg("settingsSaved");
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2000);
}

const ID_MAP = {
    'highlightToggle': 'highlightEnabled',
    'badgeToggle': 'badgeEnabled',
    'showCountToggle': 'showCountEnabled'
};

// 全局变量存储语言包
let languageDict = null;
let currentLanguage = 'auto';

// 获取国际化文本的包装函数
function getI18nMsg(key) {
    if (languageDict && languageDict[key]) {
        return languageDict[key].message;
    }
    return chrome.i18n.getMessage(key);
}

// 加载语言文件
async function loadLanguageDict(lang) {
    if (lang === 'auto') {
        languageDict = null;
        return;
    }
    const response = await fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`));
    languageDict = await response.json();
}

// 国际化初始化
async function initI18n() {
    const data = await chrome.storage.local.get('languageOverride');
    currentLanguage = data.languageOverride || 'auto';
    await loadLanguageDict(currentLanguage);

    document.getElementById('title').innerText = getI18nMsg("settingsTitle");
    document.getElementById('visualsTitle').innerText = getI18nMsg("visualsSection");
    document.getElementById('baseColorTitle').innerText = getI18nMsg("hatBaseColor");
    document.getElementById('baseColorDesc').innerText = getI18nMsg("hatBaseColorDesc");
    document.getElementById('customSvgTitle').innerText = getI18nMsg("customSvg");
    document.getElementById('customSvgDesc').innerText = getI18nMsg("customSvgDesc");
    document.getElementById('resetSvg').innerText = getI18nMsg("resetSvg");
    document.getElementById('featuresTitle').innerText = getI18nMsg("featuresSection");
    
    document.getElementById('languageSelectTitle').innerText = getI18nMsg("languageSelect");
    document.getElementById('languageSelectDesc').innerText = getI18nMsg("languageSelectDesc");
    
    document.getElementById('highlightTitle').innerText = getI18nMsg("highlightKey");
    document.getElementById('highlightDesc').innerText = getI18nMsg("highlightKeyDesc");
    document.getElementById('showCountTitle').innerText = getI18nMsg("showCount");
    document.getElementById('showCountDesc').innerText = getI18nMsg("showCountDesc");
    document.getElementById('badgeToggleTitle').innerText = getI18nMsg("iconBadge");
    document.getElementById('badgeToggleDesc').innerText = getI18nMsg("iconBadgeDesc");
    document.getElementById('dangerZoneTitle').innerText = getI18nMsg("dangerZone");
    document.getElementById('clearData').innerText = getI18nMsg("resetStats");
    document.getElementById('clearDataDesc').innerText = getI18nMsg("resetStatsDesc");
    
    document.getElementById('languageOverride').value = currentLanguage;
}

async function loadSettings() {
    const data = await chrome.storage.local.get(['highlightEnabled', 'badgeEnabled', 'showCountEnabled', 'baseColor', 'customSvg']);
    
    document.getElementById('highlightToggle').checked = data.highlightEnabled !== false;
    document.getElementById('badgeToggle').checked = data.badgeEnabled !== false;
    document.getElementById('showCountToggle').checked = data.showCountEnabled !== false;
    document.getElementById('baseColor').value = data.baseColor || '#ff4500';
    
    updatePreview(data.customSvg, data.baseColor || '#ff4500');
}

function updatePreview(svg, color) {
    const preview = document.getElementById('hatPreview');
    const svgToUse = svg || `
        <svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
            <path d="M20,45 Q50,5 80,45 Q50,35 20,45" fill="currentColor" />
            <path d="M15,35 Q-5,20 10,15 Q15,25 20,35" fill="currentColor" />
            <path d="M85,35 Q105,20 90,15 Q85,25 80,35" fill="currentColor" />
            <path d="M40,15 Q35,0 25,5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="M60,15 Q65,0 75,5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <circle cx="42" cy="25" r="3" fill="white" />
            <circle cx="58" cy="25" r="3" fill="white" />
        </svg>
    `;
    preview.innerHTML = svgToUse;
    const svgEl = preview.querySelector('svg');
    if (svgEl) {
        svgEl.style.color = color;
        svgEl.style.width = '100%';
        svgEl.style.height = '100%';
    }
}

document.querySelectorAll('input[type="checkbox"]').forEach(el => {
    el.onchange = (e) => {
        const storageKey = ID_MAP[e.target.id] || e.target.id;
        chrome.storage.local.set({ [storageKey]: e.target.checked });
        showToast();
    };
});

document.getElementById('languageOverride').onchange = async (e) => {
    const lang = e.target.value;
    await chrome.storage.local.set({ languageOverride: lang });
    await initI18n(); // 重新加载界面
    showToast();
};

document.getElementById('baseColor').onchange = (e) => {
    const color = e.target.value;
    chrome.storage.local.set({ baseColor: color });
    chrome.storage.local.get('customSvg', (data) => {
        updatePreview(data.customSvg, color);
    });
    showToast();
};

document.getElementById('svgUpload').onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const svgContent = event.target.result;
            if (svgContent.includes('<svg')) {
                chrome.storage.local.set({ customSvg: svgContent });
                updatePreview(svgContent, document.getElementById('baseColor').value);
                showToast();
            }
        };
        reader.readAsText(file);
    }
};

document.getElementById('resetSvg').onclick = () => {
    chrome.storage.local.set({ customSvg: null });
    updatePreview(null, document.getElementById('baseColor').value);
    document.getElementById('svgUpload').value = "";
    showToast();
};

document.getElementById('clearData').onclick = async () => {
    if (confirm(getI18nMsg("confirmReset"))) {
        await chrome.storage.local.set({ counts: {}, processedTweets: [] });
        showToast();
    }
};

initI18n().then(loadSettings);
