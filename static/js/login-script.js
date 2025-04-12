// Function to switch role in login form
function switchRole(role) {
    // Capitalized version for display
    const capitalizedRole = role.charAt(0).toUpperCase() + role.slice(1);
  
    // Update visible text for slider and heading
    document.getElementById("slider-role").innerText = capitalizedRole;
    document.getElementById("role-sign-in").innerText = capitalizedRole;
  
    // Update hidden input that gets submitted with the form
    document.getElementById("hidden-signin-role").value = role;
  
    // Update active button styles
    const buttons = document.querySelectorAll(".switcher button");
    buttons.forEach(btn => btn.classList.remove("active"));
    
    if (role === "donor") {
      buttons[0].classList.add("active");
    } else {
      buttons[1].classList.add("active");
    }
  
    // Optional: Animate slider position (if styled using CSS)
    const slider = document.querySelector(".slider");
    if (slider) {
      slider.style.left = role === "donor" ? "0" : "50%"; // Adjust based on layout
    }
  }
  
  // On page load, default role is donor
  document.addEventListener("DOMContentLoaded", () => {
    switchRole("donor"); // Ensure default state is consistent
  });
  