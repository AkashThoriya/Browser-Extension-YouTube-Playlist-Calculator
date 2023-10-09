console.log("Content script loaded");

// Function to get the text array from the YouTube playlist
function getTextArray() {
  let textArray = [];
  let timeStatusElements = document.querySelectorAll("#time-status.ytd-thumbnail-overlay-time-status-renderer");

  timeStatusElements.forEach((element) => {
      let textElement = element.querySelector("#text");
      if (textElement) {
          textArray.push(textElement.textContent.trim());
      }
  });

  return textArray;
}

// Function to calculate the total duration of the YouTube playlist
function calculateTotalDuration() {
  let textArray = getTextArray();
  let totalSeconds = 0;

  textArray.forEach((time) => {
      let parts = time.split(":").reverse();
      let seconds = parts[0] ? parseInt(parts[0]) : 0;
      let minutes = parts[1] ? parseInt(parts[1]) : 0;
      let hours = parts[2] ? parseInt(parts[2]) : 0;

      totalSeconds += seconds;
      totalSeconds += minutes * 60;
      totalSeconds += hours * 3600;
  });

  let totalMinutes = Math.floor(totalSeconds / 60);
  totalSeconds %= 60;
  let totalHours = Math.floor(totalMinutes / 60);
  totalMinutes %= 60;
  let totalDays = Math.floor(totalHours / 24);
  totalHours %= 24;

  return {
      days: totalDays,
      hours: totalHours,
      minutes: totalMinutes,
      seconds: totalSeconds,
  };
}

function getVideoTitlesAndDurations() {
  let titlesAndDurations = [];
  let titleElements = document.querySelectorAll("a[id='video-title']");
  let durationElements = document.querySelectorAll("#time-status.ytd-thumbnail-overlay-time-status-renderer #text");

  titleElements.forEach((element, index) => {
      titlesAndDurations.push({
          title: element.textContent.trim(),
          duration: durationElements[index].textContent.trim()
      });
  });

  console.log(titlesAndDurations);

  return { titlesAndDurations: titlesAndDurations };
}

function isOnPlaylistPage() {
  return window.location.href.includes("www.youtube.com/playlist?");
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  try {
      if (message.calculateDuration) {
          if (isOnPlaylistPage()) {
              sendResponse({ totalDuration: calculateTotalDuration() });
          } else {
              sendResponse({ error: "Whoops! We're in the wrong place. Let's meet on a YouTube playlist page!" });
          }
      }
      if (message.getVideoTitlesAndDurations) {
          if (isOnPlaylistPage()) {
              sendResponse({ titlesAndDurations: getVideoTitlesAndDurations() });
          } else {
              sendResponse({ error: "Whoops! We're in the wrong place. Let's meet on a YouTube playlist page!" });
          }
      } else {
          sendResponse({ error: "Unknown message received." });
      }
  } catch (error) {
      console.error("Error in content script:", error);
      sendResponse({ error: error.message });
  }
  return true;  // Keep the message channel open for asynchronous response
});
