document.addEventListener("DOMContentLoaded", () => {
  fetchRequests();
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
      // Define the status first
      const status = statusData.status || "Donation Request Listed";
      
      // Determine the class based on the status
      let statusClass = "";
      if (status === "Donation Request Listed") {
        statusClass = "blue-status";
      } else if (status === "Acknowledgement Pending") {
        statusClass = "yellow-status";
      } else if (status === "Donation Accepted") {
        statusClass = "green-status";
      } else if (status === "Donation Ongoing") {
        statusClass = "purple-status";
      } else {
        statusClass = "gray-status";
      }
  
      // Set the status text with the correct class applied to the status
      statusElement.innerHTML = `<strong>Status:</strong> <span class="${statusClass}">${status}</span>`;
  
  
          if (status === "Donation Request Listed") {
            const acceptBtn = document.createElement("button");
            acceptBtn.textContent = "Accept Donation Request";
            acceptBtn.classList.add("accept-btn");
  
            acceptBtn.addEventListener("click", () => {
              openDonorDetailsForm(requestId, req.food_item, req.quantity);
            });
  
            card.appendChild(acceptBtn);
          } else if (status === "Acknowledgement Pending" || status === "Donation Ongoing" || status === "Donation Accepted") {
            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = "Cancel Donation";
            cancelBtn.classList.add("accept-btn");
  
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
  
          requestList.appendChild(card);
        })
        .catch((error) => {
          console.error(`Error fetching status for request ${requestId}:`, error);
          statusElement.innerHTML = `<strong>Status:</strong> Error fetching status`;
          requestList.appendChild(card);
        });
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

function openDonorDetailsForm(requestId, clothItem, quantity) {
  const modal = document.createElement("div");
  modal.classList.add("modal");

  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Provide Donor Details for ${clothItem}</h2>
      <form id="donor-details-form">
        <label for="name">Name:</label>
        <input type="text" id="name" name="name" required>
        
        <label for="email">Email:</label>
        <input type="email" id="email" name="email" required>
        
        <label for="phone">Phone Number:</label>
        <input type="tel" id="phone" name="phone" required>
        
        <label for="quantity">Quantity to Fulfill (Max: ${quantity}):</label>
        <input type="number" id="quantity" name="quantity" min="1" max="${quantity}" required>
        
        <label for="notes">Additional Notes:</label>
        <textarea id="notes" name="notes"></textarea>
        
        <button type="submit">Submit</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = modal.querySelector(".close");
  closeBtn.addEventListener("click", () => {
    modal.remove();
  });

  const form = modal.querySelector("#donor-details-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = {
      name: form.querySelector("#name").value,
      email: form.querySelector("#email").value,
      phone: form.querySelector("#phone").value,
      quantity: parseInt(form.querySelector("#quantity").value),
      notes: form.querySelector("#notes").value,
    };

    fetch(`/api/accept_donation/${requestId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((response) => {
        if (response.ok) {
          modal.remove();
          alert("Donation accepted successfully!");
          fetchRequests(); // Refresh the list
        } else {
          response.json().then((data) => {
            alert(`Failed to accept donation: ${data.error}`);
          });
        }
      })
      .catch((error) => {
        console.error("Error accepting donation:", error);
        alert("An error occurred. Please try again.");
      });
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