document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const resultOutput = document.getElementById('resultOutput');
    const radioOptions = document.getElementsByName('offset');

    function getSelectedOffset() {
        for (const radio of radioOptions) {
            if (radio.checked) {
                return radio.value;
            }
        }
        return 'plus_30'; // Default
    }

    function formatTime(date) {
        // format to 'YYYY-MM-DDTHH:MM:SS.mmmZ'
        // toISOString() returns 'YYYY-MM-DDTHH:MM:SS.mmmZ' exactly (usually)
        return date.toISOString();
    }

    function updateTime() {
        const offset = getSelectedOffset();
        const now = new Date();
        let targetTime = new Date(now);

        if (offset === 'plus_30') {
            targetTime.setSeconds(now.getSeconds() + 30);
        } else if (offset === 'plus_60') {
            targetTime.setSeconds(now.getSeconds() + 60);
        }
        // if 'now', targetTime remains same

        const formattedResult = formatTime(targetTime);
        resultOutput.value = formattedResult;
        
        // Add a subtle flash effect to indicate update
        resultOutput.style.borderColor = 'var(--text-color)';
        setTimeout(() => {
            resultOutput.style.borderColor = 'var(--border-color)';
        }, 300);
    }

    async function copyToClipboard() {
        const text = resultOutput.value;
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
            
            // Visual feedback
            const originalText = copyBtn.innerText;
            copyBtn.innerText = "Copied!";
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.innerText = originalText;
                copyBtn.classList.remove('copied');
            }, 1500);
        } catch (err) {
            console.error('Failed to copy: ', err);
            // Fallback for older browsers or if permission denied (less common in modern secure contexts)
            resultOutput.select();
            document.execCommand('copy');
            alert("Copied to clipboard!");
        }
    }

    generateBtn.addEventListener('click', updateTime);
    copyBtn.addEventListener('click', copyToClipboard);
    
    // Optional: Generate on load? Python script didn't, but usually web apps do.
    // We will stick to python logic: User clicks button.
});
