document.addEventListener("DOMContentLoaded", () => {
    const clearButton = document.querySelector(".clear-btn");
    const saveButton = document.querySelector(".save-btn");

    clearButton.addEventListener("click", () => {
        document.querySelectorAll("input").forEach(input => {
            input.value = "";
        });
        document.getElementById("rsv_labuid").value = "0"; // Reset dropdown to default value
    });

    saveButton.onclick = () => {
        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const phone = document.getElementById("phone").value;
        const password = document.getElementById("password").value;
        const lab = document.getElementById("rsv_labuid").value;

        // Email validation
        const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (!name || !email || !phone || lab === "0") {
            alert("Please fill all fields and select a lab.");
            return;
        }

        if (!validateEmail(email)) {
            alert("Please enter a valid email address.");
            return;
        }

        // Save user personal information to Chrome storage
        chrome.storage.local.set({ userName: name, userEmail: email, userPhone: phone, userLab: lab, userPassword: password }, () => {
            console.log("User data saved:", { name, email, phone, lab, password });
        });

        // Remove the form after submission
        const customInputBox = document.getElementById("custom-input-box");
        if (customInputBox) {
            // document.body.removeChild(customInputBox);
            // Navigate to the previous page (popup.html)
            window.location.href = "popup.html";
        }
    };
});

document.addEventListener("DOMContentLoaded", () => {
    // Get Popup elements
    const nameField = document.getElementById("name");
    const emailField = document.getElementById("email");
    const phoneField = document.getElementById("phone");
    const labField = document.getElementById("rsv_labuid");
    const passwordField = document.getElementById("password")
    const saveButton = document.getElementById("save");
  
    chrome.storage.local.get(["userName", "userEmail", "userPhone", "userPassword", "userLab", ], (data) => {
      if (data.userName) nameField.value = data.userName;
      if (data.userEmail) emailField.value = data.userEmail;
      if (data.userPhone) phoneField.value = data.userPhone;
      if (data.userPassword) passwordField.value = data.userPassword;
      if (data.userLab) labField.value = data.userLab;
    });
  });


  
