document.addEventListener("DOMContentLoaded", function() {
    // Function to check if element is in viewport
    function isInViewport(element) {
      const rect = element.getBoundingClientRect();
      return (
        rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.75 &&
        rect.bottom >= 0
      );
    }
  
    // Function to handle scroll animations
    function handleScrollAnimations() {
      // Why Choose Us section
      const whyChooseUsHeading = document.querySelector('.why-choose-us h2');
      const features = document.querySelectorAll('.feature');
      
      // Current Scenario section
      const currentHeading = document.querySelector('.current h2');
      const explanation = document.querySelector('.explanation');
      const explanationText = document.querySelector('.explanation p');
      const explanationImage = document.querySelector('.explanation img');
      
      // Check and animate Why Choose Us section
      if (isInViewport(whyChooseUsHeading) && !whyChooseUsHeading.classList.contains('animated')) {
        whyChooseUsHeading.classList.add('animated');
      }
      
      // Check and animate features
      features.forEach((feature, index) => {
        if (isInViewport(feature) && !feature.classList.contains('animated')) {
          setTimeout(() => {
            feature.classList.add('animated');
          }, index * 200); // Staggered animation for features
        }
      });
      
      // Check and animate Current Scenario section
      if (isInViewport(currentHeading) && !currentHeading.classList.contains('animated')) {
        currentHeading.classList.add('animated');
      }
      
      if (isInViewport(explanation)) {
        if (!explanationText.classList.contains('animated')) {
          explanationText.classList.add('animated');
        }
        
        if (!explanationImage.classList.contains('animated')) {
          setTimeout(() => {
            explanationImage.classList.add('animated');
          }, 300); // Delay image animation
        }
      }
    }
  
    // Add CSS classes for animation to the elements
    const elementsToAnimate = [
      document.querySelector('.why-choose-us h2'),
      ...document.querySelectorAll('.feature'),
      document.querySelector('.current h2'),
      document.querySelector('.explanation p'),
      document.querySelector('.explanation img')
    ];
    
    elementsToAnimate.forEach(element => {
      if (element) {
        element.classList.add('scroll-element');
      }
    });
  
    // Run on scroll
    window.addEventListener('scroll', handleScrollAnimations);
    
    // Run once on page load
    handleScrollAnimations();
  });