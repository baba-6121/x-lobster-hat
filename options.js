function showToast() {
    const toast = document.getElementById('toast');
    toast.innerText = chrome.i18n.getMessage("settingsSaved");
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2000);
}

const ID_MAP = {
    'highlightToggle': 'highlightEnabled',
    'badgeToggle': 'badgeEnabled',
    'showCountToggle': 'showCountEnabled'
};

// 国际化初始化
function initI18n() {
    document.getElementById('title').innerText = chrome.i18n.getMessage("settingsTitle");
    document.getElementById('visualsTitle').innerText = chrome.i18n.getMessage("visualsSection");
    document.getElementById('baseColorTitle').innerText = chrome.i18n.getMessage("hatBaseColor");
    document.getElementById('baseColorDesc').innerText = chrome.i18n.getMessage("hatBaseColorDesc");
    document.getElementById('customSvgTitle').innerText = chrome.i18n.getMessage("customSvg");
    document.getElementById('customSvgDesc').innerText = chrome.i18n.getMessage("customSvgDesc");
    document.getElementById('resetSvg').innerText = chrome.i18n.getMessage("resetSvg");
    document.getElementById('featuresTitle').innerText = chrome.i18n.getMessage("featuresSection");
    document.getElementById('highlightTitle').innerText = chrome.i18n.getMessage("highlightKey");
    document.getElementById('highlightDesc').innerText = chrome.i18n.getMessage("highlightKeyDesc");
    document.getElementById('showCountTitle').innerText = chrome.i18n.getMessage("showCount");
    document.getElementById('showCountDesc').innerText = chrome.i18n.getMessage("showCountDesc");
    document.getElementById('badgeToggleTitle').innerText = chrome.i18n.getMessage("iconBadge");
    document.getElementById('badgeToggleDesc').innerText = chrome.i18n.getMessage("iconBadgeDesc");
    document.getElementById('dangerZoneTitle').innerText = chrome.i18n.getMessage("dangerZone");
    document.getElementById('clearData').innerText = chrome.i18n.getMessage("resetStats");
    document.getElementById('clearDataDesc').innerText = chrome.i18n.getMessage("resetStatsDesc");
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
    if (confirm(chrome.i18n.getMessage("confirmReset"))) {
        await chrome.storage.local.set({ counts: {}, processedTweets: [] });
        showToast();
    }
};

initI18n();
loadSettings();
