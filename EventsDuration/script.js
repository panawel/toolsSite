/**
 * Formats a Date object to ISO 8601 string with milliseconds and 'Z'.
 * Example: 2025-12-22T20:18:57.097Z
 */
function formatDate(date) {
    return date.toISOString().replace("Z", "") + "Z"; // Ensure it ends with Z
}

/**
 * Parses an ISO string into a Date object.
 * Handles 'Z' correctly (though Date.parse usually handles it well).
 */
function parseDate(dateStr) {
    // If it ends with Z, it's UTC.
    // If user deleted Z, we might treat as local or invalid, 
    // but consistent with python script logic we try to respect it.
    // new Date(dateStr) is generally robust.
    return new Date(dateStr);
}

/**
 * Sets the Start Date input to the current UTC time.
 */
function setCurrentTime() {
    const now = new Date();
    document.getElementById('startDate').value = formatDate(now);
}

/**
 * Main logic to generate the event schedule table.
 */
function generateTable() {
    const resultText = document.getElementById('resultText');

    try {
        // Get Inputs
        const count = parseInt(document.getElementById('count').value, 10);
        const counterStart = parseInt(document.getElementById('counterStart').value, 10);
        const startDateStr = document.getElementById('startDate').value.trim();
        const eventDurationMin = parseInt(document.getElementById('duration').value, 10);
        const rewardDurationVal = document.getElementById('rewardDuration').value.trim();

        let rewardDurationMin = 0;
        let includeReward = false;

        if (rewardDurationVal !== "") {
            rewardDurationMin = parseInt(rewardDurationVal, 10);
            includeReward = true;
        }

        // Validate basic inputs
        if (isNaN(count) || isNaN(counterStart) || isNaN(eventDurationMin)) {
            throw new Error("Please check numeric fields.");
        }

        let currentStart = parseDate(startDateStr);
        if (isNaN(currentStart.getTime())) {
            throw new Error("Invalid start date format.");
        }

        let outputLines = [];

        // Loop
        for (let i = 0; i < count; i++) {
            const currentCounter = counterStart + i;

            // Calculate Dates
            // currentStart is Date object.

            // Event End
            const endDate = new Date(currentStart.getTime() + eventDurationMin * 60000);

            // Reward End
            const endRewardDate = new Date(endDate.getTime() + rewardDurationMin * 60000);

            // Format Strings
            const startStr = formatDate(currentStart);
            const endStr = formatDate(endDate);
            const endRewardStr = formatDate(endRewardDate);

            let row = "";

            if (includeReward) {
                // Tab separated: counter, start, end, end_reward
                row = `${currentCounter}\t${startStr}\t${endStr}\t${endRewardStr}`;
                // Set next start to be this round's end reward time
                currentStart = endRewardDate;
            } else {
                // Tab separated: counter, start, end
                row = `${currentCounter}\t${startStr}\t${endStr}`;
                // If no reward duration is used logical next start? 
                // The python script logic: 
                // "current_start = end_reward_date"
                // Even if reward is 0, end_reward_date = end_date + 0.
                // So next start is End of Event (or End of Reward if exists).
                currentStart = endRewardDate;
            }

            outputLines.push(row);
        }

        resultText.value = outputLines.join("\n");

    } catch (e) {
        resultText.value = `Error: ${e.message}`;
    }
}

/**
 * Copies the output to clipboard.
 */
async function copyToClipboard() {
    const resultText = document.getElementById('resultText');
    const text = resultText.value;

    if (!text) return;

    try {
        await navigator.clipboard.writeText(text);
        // Visual feedback could be added here
        const originalText = "Copy";
        const btn = document.querySelector('.btn-icon');
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;

        setTimeout(() => {
            btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy`;
        }, 2000);

    } catch (err) {
        resultText.value += `\n[System] Clip error: ${err}`;
    }
}
