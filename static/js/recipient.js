document.addEventListener("DOMContentLoaded", () => {
  fetch("/api/my_requests")
    .then(response => {
      if (!response.ok) throw new Error("Network error");
      return response.json();
    })
    .then(data => {
      const container = document.getElementById("recipient-requests-body");
      container.innerHTML = "";

      if (Array.isArray(data) && data.length > 0) {
        data.forEach(item => {
          const card = document.createElement("div");
          card.classList.add("card");

          card.innerHTML = `
            <h3>${item.food_item.toUpperCase()}</h3>
            <p><strong>Quantity (in numbers):</strong> <span class="editable" data-field="quantity">${item.quantity}</span></p>
            <p><strong>Location:</strong> <span class="editable" data-field="location">${item.location}</span></p>
            <p><strong>Expiry:</strong> <span class="editable" data-field="expiry_time">${item.expiry_time}</span></p>
            <p><strong>Description:</strong> <span class="editable" data-field="desc">${item.desc || "No description provided."}</span></p>
            <button class="edit-btn">Edit</button>
            <button class="remove-btn">Remove</button>
          `;

          // Append card to container
          container.appendChild(card);

          // REMOVE handler
          card.querySelector(".remove-btn").addEventListener("click", () => {
            fetch(`http://127.0.0.1:5000/api/delete_request/${item.id}`, {
              method: "DELETE"
            })
            .then(res => {
              if (res.ok) {
                card.remove(); // Remove from UI
              } else {
                alert("Error deleting request");
              }
            });
          });

          // EDIT handler
          card.querySelector(".edit-btn").addEventListener("click", () => {
            const editableFields = card.querySelectorAll(".editable");
            const updatedData = {};

            editableFields.forEach(span => {
              const newValue = prompt(`Edit ${span.dataset.field}`, span.textContent);
              if (newValue !== null) {
                span.textContent = newValue;
                updatedData[span.dataset.field] = newValue;
              }
            });

            // Send updated data to backend
            fetch(`http://127.0.0.1:5000/api/edit_request/${item.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(updatedData)
            })
            .then(res => {
              if (!res.ok) alert("Failed to update");
            });
          });
        });
      } else {
        container.innerHTML = "<p>No requests found.</p>";
      }
    })
    .catch(error => console.error("Error fetching requests:", error));
});
