function renderRequests(requests) {
    const requestList = document.getElementById("requests");
    requestList.innerHTML = "";
  
    if (requests.length === 0) {
      requestList.innerHTML = "<p>No matching requests found.</p>";
      return;
    }
  
    requests.forEach((req) => {
      const card = document.createElement("div");
      card.classList.add("request-card");
  
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(req.location)}`;
  
      card.innerHTML = `
      <h3>${req.food_item.toUpperCase()}</h3>
      <p><strong>Quantity:</strong> ${req.quantity}</p>
      <p><strong>Expires On:</strong> ${req.expiry_time}</p>
      <p><strong>Description:</strong> ${req.desc}</p>

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

      <button class="accept-btn">Accept Donation Request</button>
    `;
    
    
  
      requestList.appendChild(card);
    });
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/all_requests')
 // Make sure this matches your backend route
      .then(response => response.json())
      .then(data => {
        renderRequests(data);
      })
      .catch(error => {
        console.error("Error fetching recipient data:", error);
      });
  });
  