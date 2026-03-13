function showToast() {
    const toast = document.getElementById('toast');
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2000);
}

// 加载设置
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

// 绑定事件
document.querySelectorAll('input[type="checkbox"]').forEach(el => {
    el.onchange = (e) => {
        chrome.storage.local.set({ [e.target.id]: e.target.checked });
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

document.getElementById('clearData').onclick = async () => {
    if (confirm('Are you sure you want to reset all stats?')) {
        await chrome.storage.local.set({ counts: {}, processedTweets: [] });
        showToast();
    }
};

loadSettings();
