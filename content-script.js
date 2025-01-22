(function scrapeReservations() {

  const rsvBodyList = document.querySelector(".rsv_body_list");
  const noDataElement = rsvBodyList.querySelector("p.nodata");

  if (noDataElement) {
    chrome.storage.local.set({ reservations: [] });
  } else {
    console.info("No reservations found.");
  }

  const facilityName = document.querySelector(".facname")?.textContent.trim() || "Unknown Facility";
  chrome.storage.local.set({ facilityName }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error storing facilityName:", chrome.runtime.lastError.message);
    } else {
      console.log("facilityName has been stored:", facilityName);
    }
  });

  if (!rsvBodyList) return;

  const dtElements = rsvBodyList.querySelectorAll("dl.rsv_list dt");
  const ddElements = rsvBodyList.querySelectorAll("dl.rsv_list dd");

  if (dtElements.length !== ddElements.length) {
    console.error("Mismatched <dt> and <dd> elements");
    return;
  }

  // Extract reservation details (e.g. 1/20 22:00 ～ 1/21 2:00). Note: 2nd date is optional 
  const dateTimeRegex = /(\d+\/\d+)\s+(\d+:\d+)\s*～\s*(?:(\d+\/\d+)\s+)?(\d+:\d+)/;

  // Extract lab info "e.g. Suga lab（24638）"
  const labInfoRegex = /^(.+?)（(.+?)）$/;

  // Parse reservation datetime details
  const parseDateTime = (text) => {
    const match = text.match(dateTimeRegex);
    return match ? { startDate: match[1], startTime: match[2], endDate: match[3], endTime: match[4] } : {};
  };

  // Parse lab info details
  const parseLabInfo = (text) => {
    const match = text.match(labInfoRegex);
    return match ? { lab: match[1], labInfo: match[2] } : { lab: text, labInfo: "" };
  };

  const reservations = [];
  try {
    for (let i = 0; i < dtElements.length; i++) {
      // Parse reservation details
      const { startDate, startTime, endDate = startDate, endTime } = parseDateTime(dtElements[i].textContent.trim());

      // Parse name and lab info
      const ddText = ddElements[i].textContent.trim();
      const nameLabParts = ddText.split(" / ");
      const name = nameLabParts.length > 0 ? nameLabParts[0] : "";
      const { lab, labInfo } = nameLabParts.length > 1 ? parseLabInfo(nameLabParts[1]) : { lab: "", labInfo: "" };

      // Add parsed reservation to the array
      reservations.push({ startDate, startTime, endDate, endTime, name, lab, labInfo });
    }

    if (reservations.length === 0) {
      console.warn("No reservations found.");
      return;
    }

    // Store reservations in Chrome storage
    chrome.storage.local.set({ reservations }, () => {
      if (chrome.runtime.lastError) {
        console.error("Failed to save reservations to Chrome storage:", chrome.runtime.lastError.message);
      } else {
        console.log("Reservations stored successfully:", reservations);
      }
    });
  } catch (error) {
    console.error("Error during scraping reservations:", error.message, error.stack);
  }
})();

// Autofill reservation form
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "AUTOFILL") {
    const { userName, userEmail, userPhone, userPassword, userLab, reserveInfo } = message;

    document.querySelector("#rsv_name").value = userName;
    document.querySelector("#rsv_email").value = userEmail;
    document.querySelector("#rsv_telext").value = userPhone;
    document.querySelector("#rsv_delpass").value = userPassword;
    document.querySelector("#rsv_labuid").value = userLab;

    if (reserveInfo) {
      const { startHour, startMinute, endHour, endMinute } = reserveInfo;

      document.querySelector("#rsv_sth").value = startHour;
      document.querySelector("#rsv_stm").value = startMinute;
      document.querySelector("#rsv_edh").value = endHour;
      document.querySelector("#rsv_edm").value = endMinute;
    }

    sendResponse({ status: "success" });
  }
});

// Press the request button
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TRIGGER_REQUEST_BUTTON") {
    try {
      const requestButton = document.querySelector("button.positive[type='submit']");
      if (requestButton) {
        requestButton.click();
        sendResponse({ status: "success" });
        // Re-initialize reserveInfo from storage
        chrome.storage.local.set({ reserveInfo: {} });
      } else {
        console.warn("Request button not found on the page.");
        sendResponse({ status: "failure", error: "Request button not found." });
      }
    } catch (error) {
      console.error("Error clicking request button:", error.message);
      sendResponse({ status: "failure", error: error.message });
    }
  }
});


// chrome.storage.local.get(null, (result) => {
//   console.log("chrome.storage.local data:", result);
// });

(function() {
  const firstImg = document.querySelector("#sec_availability table.rsv_graph tbody img");
  if (!firstImg) {
    console.warn("No reservation image found.");
    return;
  } 

  if (firstImg.classList.contains("blank")) {
    chrome.storage.local.set({ firstImgAlt: "" });
    return; 
  }

  const altText = firstImg.getAttribute("alt");
  if (!altText) {
    console.warn("Reservation image does not have an alt attribute.");
    return;
  } else {
    chrome.storage.local.set({ firstImgAlt: altText }, () => {
      if (chrome.runtime.lastError) {
        console.error("Failed to store alt text in Chrome storage:", chrome.runtime.lastError);
      } else {
        console.log("Alt text successfully stored:", altText);
      }
    });
  }
})();