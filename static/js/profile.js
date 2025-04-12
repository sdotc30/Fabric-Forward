document.addEventListener("DOMContentLoaded", () => {
    // Fetch user details from Flask backend
    fetch("/api/profile_data")
    .then(response => response.json())
    .then(userData => {
        console.log("API Response:", userData); // 💥 check here

        if (userData.error) {
            alert(userData.error);
            return;
        }

        // Fix the mismatch between 'Name' and 'name' in the HTML element
        document.getElementById("user-name").textContent = userData.Name;  // Use 'Name' here
        document.getElementById("user-email").textContent = userData.email;
        document.getElementById("user-role").textContent = userData.role;
  
        // ✅ Static Donations Data
        const donations = [
          { item: "T-Shirt", date: "2025-03-25", status: "Completed" },
          { item: "Pajamas", date: "2025-03-28", status: "Completed" }
        ];
  
        const ongoingDonations = [
          { item: "Shirt", quantity: "5 pieces", location: "Chennai" }
        ];
  
        // ✅ Display Impact Summary
        document.getElementById("donations-count").textContent = donations.length;
        document.getElementById("requests-fulfilled").textContent = Math.floor(donations.length * 0.8);
  
        // ✅ Display Donation History
        const historyList = document.getElementById("history-list");
        historyList.innerHTML = "";  // Clear list
        if (donations.length > 0) {
          donations.forEach(donation => {
            const li = document.createElement("li");
            li.innerHTML = `
              <strong>${donation.item}</strong> - ${donation.date} 
              <span>(${donation.status})</span>
            `;
            historyList.appendChild(li);
          });
        } else {
          historyList.innerHTML = "<li>No past donations.</li>";
        }
  
        // ✅ Display Ongoing Donations
        const ongoingList = document.getElementById("ongoing-list");
        ongoingList.innerHTML = "";  // Clear list
        if (ongoingDonations.length > 0) {
          ongoingDonations.forEach(donation => {
            const li = document.createElement("li");
            li.innerHTML = `
              <strong>${donation.item}</strong> - ${donation.quantity} 
              <br>📍 ${donation.location}
            `;
            ongoingList.appendChild(li);
          });
        } else {
          ongoingList.innerHTML = "<li>No ongoing donations.</li>";
        }
    })
    .catch(error => {
        console.error("Error fetching profile data:", error);
    });
});
