document.addEventListener("DOMContentLoaded", () => {
  fetchRequests();
  fetchMyDonations();
});

function fetchRequests() {
  fetch("/api/all_requests")
    .then((response) => response.json())
    .then((data) => {
      renderRequests(data);
    })
    .catch((error) => {
      console.error("Error fetching recipient data:", error);
    });
}

function fetchMyDonations() {
  fetch("/api/my_donations")
    .then((response) => response.json())
    .then((data) => {
      renderMyDonations(data);
    })
    .catch((error) => {
      console.error("Error fetching donor's donations:", error);
    });
}

function renderRequests(requests) {
  const requestList = document.getElementById("requests");
  requestList.innerHTML = "";

  if (requests.length === 0) {
    requestList.innerHTML = "<p>No matching requests found.</p>";
    return;
  }

  // Keep track of how many requests have been processed
  let requestsProcessed = 0;
  const totalRequests = requests.length;

  requests.forEach((req) => {
    const card = document.createElement("div");
    card.classList.add("request-card");

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(req.location)}`;

    card.innerHTML = `
      <h3>${req.cloth_item.toUpperCase()}</h3>
      <p><strong>Quantity:</strong> ${req.quantity}</p>
      <p><strong>Gender:</strong> ${req.gender}</p>
      <p><strong>Age Group:</strong> ${req.age_group}</p>
      <p><strong>Required Cloth Size:</strong> ${req.size}</p>
      <p><strong>Description:</strong> ${req.desc || "No description provided."}</p>
      <div class="map-container">
        <iframe
          width="100%"
          height="200"
          frameborder="0"
          style="border:0"
          src="https://www.google.com/maps?q=${encodeURIComponent(req.location)}&output=embed"
          allowfullscreen>
        </iframe>
      </div>
      <a href="${mapsUrl}" target="_blank" class="map-link">Open in Google Maps</a>
    `;

    const statusElement = document.createElement("p");
    card.appendChild(statusElement);

    // Use the correct request ID (some APIs use .id, others use .rid)
    const requestId = req.rid || req.id;

    // Fetch the status before adding buttons
    fetch(`/api/status/${requestId}`)
      .then((response) => response.json())
      .then((statusData) => {
        // Get the status or default to "Donation Request Listed"
        const status = statusData.status || "Donation Request Listed";
        
        console.log(`Request ID: ${requestId}, Status: ${status}`); // Debug logging
        
        statusElement.innerHTML = `<strong>Status:</strong> ${status}`;

        if (status === "Acknowledgement Pending" || status === "Donation Ongoing" || status === "Donation Accepted") {
          const cancelBtn = document.createElement("button");
          cancelBtn.textContent = "Cancel Donation";
          cancelBtn.classList.add("cancel-btn");

          cancelBtn.addEventListener("click", () => {
            fetch(`/api/status/delete/${requestId}`, {
              method: "DELETE",
            })
              .then((response) => {
                if (response.ok) {
                  card.remove();
                  alert("Donation canceled successfully!");
                } else {
                  alert("Failed to cancel donation.");
                }
              })
              .catch((error) => {
                console.error("Error canceling donation:", error);
                alert("An error occurred. Please try again.");
              });
          });

          card.appendChild(cancelBtn);
        } else if (status === "Donation Request Listed") {
          const acceptBtn = document.createElement("button");
          acceptBtn.textContent = "Accept Donation Request";
          acceptBtn.classList.add("accept-btn");

          acceptBtn.addEventListener("click", () => {
            fetch("/api/status/create", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ rid: requestId }),
            })
              .then((response) => {
                if (response.ok) {
                  statusElement.innerHTML = `<strong>Status:</strong> Acknowledgement Pending`;
                  acceptBtn.remove();
                  
                  if(status == 'Donation Ongoing'){
                    const cancelBtn = document.createElement("button");
                  cancelBtn.textContent = "Cancel Donation";
                  cancelBtn.classList.add("cancel-btn");
                  cancelBtn.addEventListener("click", () => {
                    fetch(`/api/status/delete/${requestId}`, {
                      method: "DELETE",
                    })
                      .then((response) => {
                        if (response.ok) {
                          card.remove();
                          alert("Donation canceled successfully!");
                        } else {
                          alert("Failed to cancel donation.");
                        }
                      })
                      .catch((error) => {
                        console.error("Error canceling donation:", error);
                        alert("An error occurred. Please try again.");
                      });
                  });
                  
                  card.appendChild(cancelBtn);
                  }
                  
                  
                  
                } else {
                  response.json().then((data) => {
                    alert(`Failed to accept donation: ${data.error}`);
                  });
                }
              });
          });

          card.appendChild(acceptBtn);
        }
        
        // Append the card to the DOM now that we have the status
        requestList.appendChild(card);
        
        // Keep track of processed requests and log when all are done
        requestsProcessed++;
        if (requestsProcessed === totalRequests) {
          console.log("All requests processed and rendered");
        }
      })
      .catch((error) => {
        console.error(`Error fetching status for request ${requestId}:`, error);
        statusElement.innerHTML = `<strong>Status:</strong> Error fetching status`;
        requestList.appendChild(card);
        
        // Count this as processed even if there was an error
        requestsProcessed++;
      });
  });
}

function renderMyDonations(donations) {
  const donationList = document.getElementById("my-donations");
  if (!donationList) {
    console.warn("my-donations element not found in the DOM");
    return;
  }
  
  donationList.innerHTML = "";

  if (donations.length === 0) {
    donationList.innerHTML = "<p>You haven't accepted any donations yet.</p>";
    return;
  }

  donations.forEach((donation) => {
    const card = document.createElement("div");
    card.classList.add("donation-card");

    card.innerHTML = `
      <h3>${donation.cloth_item.toUpperCase()}</h3>
      <p><strong>Quantity:</strong> ${donation.quantity}</p>
      <p><strong>Gender:</strong> ${donation.gender}</p>
      <p><strong>Age Group:</strong> ${donation.age_group}</p>
      <p><strong>Size:</strong> ${donation.size}</p>
      <p><strong>Description:</strong> ${donation.desc || "No description provided."}</p>
      <p><strong>Location:</strong> ${donation.location}</p>
      <p><strong>Status:</strong> ${donation.status}</p>
    `;

     if (donation.status === "Donation Ongoing") {
      const completeBtn = document.createElement("button");
      completeBtn.textContent = "Mark as Completed";
      completeBtn.addEventListener("click", () => {
        updateStatus(donation.rid, "Donation Completed", card);
      });
      card.appendChild(completeBtn);
    }

    donationList.appendChild(card);
  });
}

function updateStatus(donationId, newStatus, card) {
  fetch(`/api/update_status/${donationId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: newStatus }),
  })
    .then((response) => {
      if (response.ok) {
        alert("Status updated to " + newStatus);
        fetchMyDonations();
      } else {
        alert("Failed to update status.");
      }
    })
    .catch((error) => {
      console.error("Error updating status:", error);
      alert("An error occurred while updating status.");
    });
}

function applyFilter() {
  const locationInput = document.getElementById("filter-location").value.trim();
  const genderInput = document.getElementById("filter-gender").value;
  const ageGroupInput = document.getElementById("filter-age_group").value;
  const sizeInput = document.getElementById("filter-size").value;

  const queryParams = new URLSearchParams();

  if (locationInput !== "") {
    queryParams.append("location", locationInput);
  }
  if (genderInput !== "") {
    queryParams.append("gender", genderInput);
  }
  if (ageGroupInput !== "") {
    queryParams.append("age_group", ageGroupInput);
  }
  if (sizeInput !== "") {
    queryParams.append("size", sizeInput);
  }

  fetch(`/api/all_requests?${queryParams.toString()}`)
    .then((response) => response.json())
    .then((data) => {
      renderRequests(data);
    })
    .catch((error) => {
      console.error("Error filtering requests:", error);
    });
}

function resetFilter() {
  document.getElementById("filter-location").value = "";
  document.getElementById("filter-gender").value = "";
  document.getElementById("filter-age_group").value = "";
  document.getElementById("filter-size").value = "";
  applyFilter();
}