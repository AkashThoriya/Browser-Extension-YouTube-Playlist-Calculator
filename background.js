chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.getDuration) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { calculateDuration: true }, function (response) {
                if (chrome.runtime.lastError) {
                    // console.error("Error in background script:", chrome.runtime.lastError);
                    sendResponse({ error: "Whoops! We're in the wrong place. Let's meet on a YouTube playlist page!" });
                } else if (response.error) {
                    sendResponse({ error: response.error });
                } else if (response.totalDuration) {
                    let totalDuration = response.totalDuration;
                    sendResponse({ totalDuration: totalDuration });
                }
            });
        });
        return true; // Will respond asynchronously.
    }
});