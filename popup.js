document.addEventListener("DOMContentLoaded", () => {
  showFacilityName()
  renderCrossDayBlock();
  initializeTimeline();
  drawHourLines();
  loadReservations();
  addOrUpdateCurrentTimeLine();
  setInterval(updateCurrentTimeLinePosition, 60 * 1000);
});

function initializeTimeline() {
  const TIMELINE_HEIGHT = 960;
  const HOURS_PER_DAY = 24;
  window.PX_PER_HOUR = TIMELINE_HEIGHT / HOURS_PER_DAY;
}

function renderCrossDayBlock() {
  chrome.storage.local.get(["firstImgAlt"], (result) => {
    if (result.firstImgAlt) {
      const crossDayAlt = result.firstImgAlt;

      // Extract reservation details (e.g. 1/20 22:00 ～ 1/21 2:00). Note: 2nd date is optional 
      const firstImgDateRegex = /(\d+\/\d+)\s+(\d+:\d+)\s*～\s*(?:(\d+\/\d+)\s+)?(\d+:\d+)/;
      const match = crossDayAlt.match(firstImgDateRegex);

      if (!match) {
        console.log("Regex did not match the ALT text.");
        return;
      }

      const startDate = match[1];
      const startTime = match[2];
      const endDate = match[3] ? match[3] : startDate;
      const endTime = match[4];

      // Triggers only if a reservation from the previous day spans midnight
      if (startDate !== endDate) {

        const startDecimal = 0;
        const endDecimal   = parseTimeToHours(endTime);

        const crossDayRes = {
          name: "Cross Day Reservation",
          lab: "--",  // Can be extracted from img src with regex. TODO
          startTime,
          endTime,
          startDate,
          endDate
        };

        renderSingleDayBlock(startDate, startDecimal, endDecimal, crossDayRes);
      }
    }
  });
}
;

function showFacilityName() {
  chrome.storage.local.get("facilityName", (result) => {
    if (chrome.runtime.lastError) {
      console.error("Error retrieving facilityName:", chrome.runtime.lastError.message);
      return;
    }
    const facilityName = result.facilityName || "Unknown Facility";
    // const facility = document.createElement("h1");

    // facility.textContent = `Reservations \n (${facilityName})`;
    // facility.style.textAlign = "center";

    const btnContainer = document.querySelector(".button-container");
    // const editButton = document.querySelector('.edit-btn');

    if (btnContainer) {
      // btnContainer.prepend(facility);
      let existingH1 = btnContainer.querySelector("h1");
      if (existingH1) {
        existingH1.textContent = `Reservations \n (${facilityName})`;
      } else {
        const facility = document.createElement("h1");
        facility.textContent = `Reservations \n (${facilityName})`;
        facility.style.textAlign = "center";
        btnContainer.prepend(facility);
      }
    } else {
      console.error("btn-container not found.");
    }
  }); 
};

// Generate time table hour lines and labels
function drawHourLines() {
  const fragment = document.createDocumentFragment();
  const labelFragment = document.createDocumentFragment();

  for (let hour = 0; hour <= 24; hour++) {
    const topPos = hour * PX_PER_HOUR;

    const line = document.createElement("div");
    line.className = "hour-line";
    line.style.top = `${topPos}px`;
    fragment.appendChild(line);

    const label = document.createElement("div");
    label.className = "hour-label";
    label.style.top = `${topPos}px`;
    label.textContent = `${hour}:00`;
    labelFragment.appendChild(label);
  }
  timeline.appendChild(fragment);
  document.getElementById("hour-labels").appendChild(labelFragment);
}

function loadReservations() {
  chrome.storage.local.get(["reservations"], (result) => {
    const reservations = result.reservations || [];
    reservations.forEach(renderReservationBlock);
    if (reservations.length === 0) {
      const noReservationsMessage = document.createElement("div");
      noReservationsMessage.textContent = "No reservations found for today. (Refresh may be needed)";
      noReservationsMessage.style.color = "#666";
      document.getElementById("timeline").appendChild(noReservationsMessage);
    }
  });
}

function renderReservationBlock(res) {
  const start = parseTimeToHours(res.startTime);
  const end = parseTimeToHours(res.endTime);

  // If current day reservation spans midnight, only show start to midnight
  if (res.endDate && res.endDate !== res.startDate) {
    renderSingleDayBlock(res.startDate, start, 24, res); // From start to midnight
    // renderSingleDayBlock(res.endDate, 0, end, res); // From midnight to end
  } else {
    // Single-day reservation
    renderSingleDayBlock(res.startDate, start, end, res);
  }
}

function hoursToMinutes(decimalHours) {
  return Math.round(decimalHours * 60);
}

function renderSingleDayBlock(date, start, end, res) {
  const startMin = hoursToMinutes(start);
  const endMin = hoursToMinutes(end);

  const topPos = Math.min(start, 24) * PX_PER_HOUR;
  const blockHeight = Math.max(0, (Math.min(end, 24) - start) * PX_PER_HOUR);

  const block = document.createElement("div");
  block.classList.add("reservation-block");
  block.style.top = `${topPos}px`;
  block.style.height = `${blockHeight}px`;

  block.dataset.startMin = startMin;  
  block.dataset.endMin = endMin;

  const labStyles = {
    "Oguri": { backgroundColor: "#5BCAF5", outline: "2px solid #5bb7f5" },
    "Suga": { backgroundColor: "#CD212A", outline: "2px solid #bf1f27" },
    "Yamada": { backgroundColor: "#FFB951", outline: "2px solid #edac4c" },
    "Goda": { backgroundColor: "#0303EF", outline: "2px solid #0404D6" },
    "Tsukuda": { backgroundColor: "#54D6A9", outline: "2px solid #45B08B" },
    "Campbell": { backgroundColor: "#8E8EFF", outline: "2px solid #8E8EFF" },
    "Kobayashi": { backgroundColor: "#0303EF", outline: "2px solid #0404D6" },
    "Isobe": { backgroundColor: "#00AC00", outline: "2px solid #009E00" }
  };
  
  // Default style
  const defaultStyle = { backgroundColor: "#C0C0C0", outline: "2px solid #C0C0C0" };
  
  // Find the matching style or use the default
  const labName = Object.keys(labStyles).find(name => res.lab.includes(name));
  const { backgroundColor, outline } = labStyles[labName] || defaultStyle;
  
  block.style.backgroundColor = backgroundColor;
  block.style.outline = outline;

  // Display reservation information of each block
  block.title = `${res.name} (${res.lab})\n${res.startTime}–${res.endTime}`;
  block.textContent = `${res.name} (${res.lab} Lab)\n${res.startTime}–${res.endTime}`;

  document.getElementById("timeline").appendChild(block);
  block.classList.add("reservation-block");
};


function addOrUpdateCurrentTimeLine() {
  const timeline = document.getElementById("timeline");
  let nowLine = document.getElementById("current-time-line");
  if (!nowLine) {
    nowLine = document.createElement("div");
    nowLine.id = "current-time-line";
    nowLine.className = "current-time-line";
    timeline.appendChild(nowLine);
  }
  updateCurrentTimeLinePosition();
}

function updateCurrentTimeLinePosition() {
  const now = new Date();
  const currentHourDecimal = now.getHours() + now.getMinutes() / 60;
  const topPos = Math.min(currentHourDecimal, 24) * PX_PER_HOUR;

  const nowLine = document.getElementById("current-time-line");
  if (nowLine) nowLine.style.top = `${topPos}px`;
}

function parseTimeToHours(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h + m / 60;
}

// Monitor uesr mouse click and drag to create time blocks
(function() {
  const table = document.getElementById("timeline-container");

  if (!table) return; 

  let isDragging = false;
  let hasDragged = false;
  let startY = null;
  let endY = null;
  let selectionDiv = null;
  const allSelections = [];

  table.addEventListener("mousedown", (e) => {
    // Ignore right-click
    if (e.button === 2) return;

    // Skip creation if user clicked on a reservation block
    if (e.target.classList.contains("reservation-block")) {
      console.log("Clicked on existing reservation block. Skipping.");
      return;
    }

    // Only one selection rectangle allowed to present
    if (allSelections.length > 0) {
      console.log("Only one selection is allowed at a time. Remove the existing one first.");
      return;
    }

    isDragging = true;
    hasDragged = false;

    const snapToGrid = 960 / (24 * 60 / 5); 
    startY = Math.round(e.offsetY / snapToGrid) * snapToGrid;
    // console.log(offsetY);

    selectionDiv = document.createElement("div");
    selectionDiv.className = "selection-rectangle";
    selectionDiv.style.top = `${startY}px`;
    selectionDiv.style.left = `0`;
    selectionDiv.style.width = `100%`;
    selectionDiv.style.height = `${snapToGrid}px`;

    // Time description of user created time block
    const timeInfoDiv = document.createElement("div");
    timeInfoDiv.className = "time-info";
    timeInfoDiv.style.position = "absolute";
    timeInfoDiv.style.top = `${startY + parseInt(selectionDiv.style.height)}px`;
    timeInfoDiv.style.left = "5px";
    timeInfoDiv.style.color = "black";
    timeInfoDiv.style.backgroundColor = "white";
    timeInfoDiv.style.padding = "2px 5px";
    timeInfoDiv.style.fontSize = "12px";

    selectionDiv.appendChild(timeInfoDiv);
    timeline.appendChild(selectionDiv);

    endY = startY + snapToGrid;
  });

  table.addEventListener("mousemove", (e) => {
    if (isDragging && selectionDiv) {
      hasDragged = true;
      const snapToGrid = 960 / (24 * 60 / 5);
      endY = Math.round(e.offsetY / snapToGrid) * snapToGrid;
      const top = Math.min(startY, endY);
      const height = Math.abs(startY - endY);
      selectionDiv.style.top = `${top}px`;
      selectionDiv.style.height = `${height}px`;

    // Convert pixel to minutes in integer
    const startObj = convertToTime(top);
    const endObj = convertToTime(top + height);
    const selectionStartMin = parseInt(startObj.hour, 10) * 60 + parseInt(startObj.minute, 10);
    const selectionEndMin = parseInt(endObj.hour, 10) * 60 + parseInt(endObj.minute, 10);

    selectionDiv.dataset.startMin = selectionStartMin;
    selectionDiv.dataset.endMin = selectionEndMin;

    const timeInfoDiv = selectionDiv.querySelector(".time-info");
      updateTimeInfo(timeInfoDiv, top, top + height);

    const sStartMin = parseInt(selectionDiv.dataset.startMin, 10);
    const sEndMin   = parseInt(selectionDiv.dataset.endMin, 10);
    const overlaps = Array.from(document.querySelectorAll(".reservation-block")).some((block) => {
      const bStartMin = parseInt(block.dataset.startMin, 10);
      const bEndMin   = parseInt(block.dataset.endMin, 10);
      return sStartMin < bEndMin && sEndMin > bStartMin;
    });

    // Selection block turns red if overlaps with existing blocks
    if (overlaps) {
      selectionDiv.classList.add("overlap-warning");
    } else {
      selectionDiv.classList.remove("overlap-warning");
    }
    }
  });

  table.addEventListener("mouseup", (e) => {
    if (isDragging) {
      isDragging = false;

      // 5 minute reservation block
      const snapToGrid = 960 / (24 * 60 / 5);

      // 10 minute reservation block
      const defaultGrid = 960 / (24 * 60 / 5) * 2;   

      if (!hasDragged) {
        // If no actual drag, keep a default 5-min block
        endY = startY + defaultGrid;
      }

      const top = Math.min(startY, endY);
      const height = Math.abs(startY - endY);

      // Enforce grid snapping
      if (height < snapToGrid) {
        if (selectionDiv) selectionDiv.remove();
        selectionDiv = null;
        return;
      }

    // Overlap check with existing reservation blocks
    const sStartMin = parseInt(selectionDiv.dataset.startMin, 10);
    const sEndMin   = parseInt(selectionDiv.dataset.endMin, 10);

    const selectionTop = parseFloat(selectionDiv.style.top);
    const selectionHeight = parseFloat(selectionDiv.style.height);
    const selectionBottom = selectionTop + selectionHeight;
    const anyOverlap = Array.from(document.querySelectorAll(".reservation-block")).some((block) => {
      const bStartMin = parseInt(block.dataset.startMin, 10);
      const bEndMin   = parseInt(block.dataset.endMin, 10);
      return (sStartMin < bEndMin && sEndMin > bStartMin);
    });
      
      if (anyOverlap) {
        console.log("Overlap detected. Removing selection rectangle.");
        selectionDiv.remove();
        selectionDiv = null;
        return;
      }

      const start = convertToTime(top);
      const end = convertToTime(top + height);

      const timeData = {
        startHour: start.hour,
        startMinute: start.minute,
        endHour: end.hour,
        endMinute: end.minute,
        element: selectionDiv,
      };

      allSelections.push(timeData);

      const { element, ...reserveInfo } = timeData;

      chrome.storage.local.set({ reserveInfo }, () => {
        if (chrome.runtime.lastError) {
          console.error(
            "Failed to save user reservation to Chrome storage:",
            chrome.runtime.lastError.message
          );
        } else {
          console.log("User reservation stored:", timeData)
        }
      });

      selectionDiv.style.pointerEvents = "auto";
      startY = null;
      endY = null;

      // Right click to remove user selected time block
      selectionDiv.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        selectionDiv.remove();
        const index = allSelections.indexOf(timeData);
        if (index !== -1) allSelections.splice(index, 1);
        chrome.storage.local.set({ reserveInfo: {} });
        console.log("Removed:", timeData);
      });
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      if (selectionDiv) selectionDiv.remove();
    }
  });

  function convertToTime(y) {
    const totalMinutes = Math.floor((y / 960) * 24 * 60);

    const snappedMinutes = Math.round(totalMinutes / 5) * 5;

    let hour = Math.floor(snappedMinutes / 60);
    let minute = snappedMinutes % 60;

    if (minute === 60) {
      minute = 0;
      hour += 1;
    }
    return {
      hour: hour.toString(), 
      minute: String(minute).padStart(2,'0')
    };
  }

  // Dynamic text update of user selected time block
  function updateTimeInfo(div, startY, endY) {
    const start = convertToTime(startY);
    const end = convertToTime(endY);
    const startTime = `${start.hour}:${start.minute}`;
    const endTime = `${end.hour}:${end.minute}`;
    const duration = 
    (parseInt(end.hour) * 60 + parseInt(end.minute)) - 
    (parseInt(start.hour) * 60 + parseInt(start.minute));
    div.textContent = `${startTime} - ${endTime} (${duration} min)`;

    // Tie the text with selected time block
    const rectangleTop = parseFloat(selectionDiv.style.top); 
    const rectangleHeight = parseFloat(selectionDiv.style.height); 
    div.style.top = `${ rectangleHeight }px`; 
  }
})();

  // Autofill reservation detail and request usage
  document.querySelector(".request-btn").addEventListener("click", async () => {
    chrome.storage.local.get(
      ["userName", "userEmail", "userPhone", "userPassword", "userLab", "reserveInfo"],
      async (result) => {
        const { userName, userEmail, userPhone, userPassword, userLab, reserveInfo } = result;
  
        if (userName && userEmail && userPhone && userPassword && userLab && reserveInfo) {
          try {
            // Query the active tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]) {
              // Send autofill data to content script
              chrome.tabs.sendMessage(
                tabs[0].id,
                { 
                  type: "AUTOFILL", 
                  userName, 
                  userEmail, 
                  userPhone, 
                  userPassword, 
                  userLab, 
                  reserveInfo 
                },
                (response) => {
                  if (chrome.runtime.lastError) {
                    console.error("Autofill failed. Please try again:", chrome.runtime.lastError.message);
                  } else if (response?.status === "success") {
                    console.log("Autofill completed.");
                  } else {
                    console.error("Autofill failed:", response?.error || "Unknown error");
                  }
                }
              );
              // Trigger request button click after autofill
              chrome.tabs.sendMessage(
                tabs[0].id,
                { type: "TRIGGER_REQUEST_BUTTON" },
                (response) => {
                  if (chrome.runtime.lastError) {
                    console.error("Error triggering request button:", chrome.runtime.lastError.message);
                  } else if (response?.status === "success") {
                    console.log("Request button clicked");
                  } else {
                    console.error("Failed to click request button:", response?.error || "Unknown error");
                  }
                }
              );
            }
          } catch (error) {
            console.error("Error interacting with active tab:", error);
          }
        } else {
          console.log("Required data not found in storage. Please set it up first.");
        }
      }
    );
  });

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    console.log("Active tab URL:", tabs[0].url);
  }
});

// Refresh the page and re-inject content-script.js
document.querySelector(".refresh-btn").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.reload(tabs[0].id, {}, () => {
        if (chrome.runtime.lastError) {
          console.error("Failed to refresh the page:", chrome.runtime.lastError.message);
        } else {
          console.log("Page refreshed successfully. Reinjecting content-script...");
          chrome.scripting.executeScript(
            {
              target: {tabId: tabs[0].id },
              files: ["content-script.js"]
            },
            () => {
              if (chrome.runtime.lastError) {
                console.error("Failed to reinject content-script:", chrome.runtime.lastError.message);
              } else {
                console.log("Content-script reinjected successfully.");
              }
            }
          );
            // Re-render the time table inside popup
            const timelineDiv = document.getElementById("timeline");
            timelineDiv.innerHTML = "";
            setTimeout(() => {
              showFacilityName()
              renderCrossDayBlock();
              initializeTimeline();
              drawHourLines();
              loadReservations();
            }, 500);
        }
      });
    } else {
      console.error("No active tab found.");
    }
  });
});

// document.addEventListener("DOMContentLoaded", () => { });

// chrome.storage.local.get(null, (result) => {
//   console.log("chrome.storage.local data:", result);
// });