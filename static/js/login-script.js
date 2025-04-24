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

  // Animate slider position
  const slider = document.querySelector(".slider");
  if (slider) {
      if (role === "donor") {
          slider.style.transform = "translateX(0%)"; // Slide to the left
      } else {
          slider.style.transform = "translateX(100%)"; // Slide to the right
      }
  }
}

// On page load, default role is donor
document.addEventListener("DOMContentLoaded", () => {
  switchRole("donor"); // Ensure default state is consistent
});