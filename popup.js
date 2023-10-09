window.onload = function () {

    // Check if the current tab is a YouTube playlist page
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        let currentURL = tabs[0].url;

        // Elements to show/hide based on the URL
        let timetableInputBox = document.querySelector(".input-box.playlist-timetable");

        if (currentURL.includes("www.youtube.com/playlist?")) {
            // If on a YouTube playlist page, show the elements
            timetableInputBox.style.display = "block";
        } else {
            // Otherwise, hide them
            timetableInputBox.style.display = "none";
        }
    });
    
    chrome.runtime.sendMessage({ getDuration: true }, function (response) {
        let durationElement = document.getElementById("duration");
        
        if (response.error) {
            durationElement.innerHTML = `<span class="error-message">${response.error}</span>`;
        } else if (response.totalDuration) {
            let totalDuration = response.totalDuration;
            let formattedDuration = formatDuration(totalDuration);
            durationElement.innerHTML = `${formattedDuration}`;
        }
    });

    document.getElementById("generateTimetable").addEventListener("click", generateTimetable);
};

function formatDuration(duration) {
    let parts = [];

    if (duration.days > 0) {
        parts.push(`<div class="duration-part"><span class="duration-value">${duration.days}</span><span class="duration-label">Days</span></div>`);
    }

    if (duration.hours > 0) {
        parts.push(`<div class="duration-part"><span class="duration-value">${duration.hours}</span><span class="duration-label">Hours</span></div>`);
    }

    if (duration.minutes > 0) {
        parts.push(`<div class="duration-part"><span class="duration-value">${duration.minutes}</span><span class="duration-label">Minutes</span></div>`);
    }

    if (duration.seconds > 0) {
        parts.push(`<div class="duration-part"><span class="duration-value">${duration.seconds}</span><span class="duration-label">Seconds</span></div>`);
    }

    return `<div class="duration-wrapper">${parts.join("")}</div>`;
}

function getVideoTitlesAndDurationsForExecution() {
    // This function will be stringified and executed in the content script context.
    // It should return the result directly.
    let titlesAndDurations = [];
    let titleElements = document.querySelectorAll("a[id='video-title']");
    let durationElements = document.querySelectorAll("#time-status.ytd-thumbnail-overlay-time-status-renderer #text");
  
    titleElements.forEach((element, index) => {
        titlesAndDurations.push({
            title: element.textContent.trim(),
            duration: durationElements[index].textContent.trim()
        });
    });
  
    return { titlesAndDurations: titlesAndDurations };
}

function generateTimetable() {
    let dailyTime = parseInt(document.getElementById("dailyTime").value);
    if (isNaN(dailyTime) || dailyTime <= 0) {
        alert("Please enter a valid time in minutes.");
        return;
    }
    
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        let tabId = tabs[0].id;
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: getVideoTitlesAndDurationsForExecution,
            args: []
        }, (results) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                return;
            }
            let timetableBox = document.getElementById("timetable");
            let response = results[0].result;  // Access the result property
            if (response && response.titlesAndDurations) {
                let titlesAndDurations = response.titlesAndDurations;
                let timetable = calculateTimetable(dailyTime, titlesAndDurations);
                let timetableElement = document.getElementById("timetable");
                timetableElement.innerHTML = timetable;
                timetableBox.style.display = "block";
            } else {
                console.error("Unexpected response from content script:", response);
                timetableBox.style.display = "none";
            }
        });
    });
}


function calculateTimetable(dailyTime, titlesAndDurations) {
    let timetable = [];
    let dailyTimeInSeconds = dailyTime * 60;
    let accumulatedTime = 0;
    let dayCount = 1;
    let continueFromPreviousDay = false;

    for (let i = 0; i < titlesAndDurations.length; i++) {
        let video = titlesAndDurations[i];
        let videoDurationParts = video.duration.split(":").reverse();
        let videoDurationInSeconds = parseInt(videoDurationParts[0]) + (parseInt(videoDurationParts[1] || 0) * 60) + (parseInt(videoDurationParts[2] || 0) * 3600);

        if (continueFromPreviousDay) {
            timetable.push({ day: dayCount, title: `Continue video #${i} - ${titlesAndDurations[i-1].title}`, duration: 'remaining' });
            continueFromPreviousDay = false;
        }

        if (accumulatedTime + videoDurationInSeconds > dailyTimeInSeconds) {
            let remainingTime = dailyTimeInSeconds - accumulatedTime;
            if (remainingTime > 0) {
                let partialDuration = formatDurationFromSeconds(remainingTime);
                timetable.push({ day: dayCount, title: `Watch part of video #${i + 1} - ${video.title}`, duration: partialDuration, isContinue:continueFromPreviousDay});
                videoDurationInSeconds -= remainingTime;
            }
            dayCount++;
            accumulatedTime = 0;
            continueFromPreviousDay = true;
        }

        if (!continueFromPreviousDay) {
            accumulatedTime += videoDurationInSeconds;
            timetable.push({ day: dayCount, title: video.title, duration: video.duration, isContinue:continueFromPreviousDay, sequence: i+1 });
        }
    }

    let daysText = timetable.length === 1 ? "day" : "days";
    let timetableHTML = `<h2 class='timetable-title'>You can finish the playlist in ${dayCount-1} ${daysText}</h2>`;
    let currentDay = 1;
    
    timetableHTML += `<div class="day-card">`; // Start the day card
    timetableHTML += `<h2>Day ${currentDay}</h2>`;
    
    for (let entry of timetable) {
        if (entry.day !== currentDay) {
            currentDay = entry.day;
            timetableHTML += `</div>`; // End the previous day card
            timetableHTML += `<div class="day-card">`; // Start a new day card
            timetableHTML += `<h2>Day ${currentDay}</h2>`;
        }
        let videoTitle = `${entry.title}`;
        let videoDuration = `<span class="timetable-duration-wrapper">${entry.duration}</span>`;
        let continueClass = entry.isContinue ? 'continue-video' : '';

        timetableHTML += `<p class="${continueClass}">${videoTitle} - ${videoDuration}</p>`;
    }
    
    timetableHTML += `</div>`; // End the last day card       

    let timetableElement = document.getElementsByClassName("print-timetable-container")[0];
    timetableElement.style.display = "block";    

    return timetableHTML;
}

function formatDurationFromSeconds(totalSeconds) {
    let seconds = totalSeconds % 60;
    let totalMinutes = Math.floor(totalSeconds / 60);
    let minutes = totalMinutes % 60;
    let hours = Math.floor(totalMinutes / 60);
    return `${hours ? hours + ":" : ""}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}


document.getElementById("printTimetable").addEventListener("click", function() {
    const printContent = document.getElementById("timetable").innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><body>');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
});