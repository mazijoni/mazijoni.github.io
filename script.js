// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get references to the form and feedback elements
    const emailForm = document.getElementById('emailForm');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');

    // Only proceed if we're on the contact page with the form
    if (emailForm) {
        // Add submit event listener to the form
        emailForm.addEventListener('submit', function(event) {
            // Prevent the default form submission
            event.preventDefault();
            
            // Get form values
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const subject = document.getElementById('subject').value.trim();
            const message = document.getElementById('message').value.trim();
            
            // Basic validation
            if (!name || !email || !subject || !message) {
                showError('Please fill in all fields');
                return;
            }
            
            // Email validation using regex
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showError('Please enter a valid email address');
                return;
            }
            
            try {
                // Construct mailto URL
                const recipientEmail = 'jonatan.lund.ermesjo@gmail.com'; // Change this to your desired email address
                const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`;
                
                // Open the user's email client
                window.location.href = mailtoUrl;
                
                // Show success message
                showSuccess();
                
                // Reset the form
                emailForm.reset();
            } catch (error) {
                // Show error message if something goes wrong
                showError('There was an error sending your message. Please try again.');
                console.error('Error sending email:', error);
            }
        });
    }
    
    // Function to show success message
    function showSuccess() {
        // Hide error message if visible
        errorMessage.style.display = 'none';
        
        // Show success message
        successMessage.style.display = 'block';
        
        // Hide success message after 5 seconds
        setTimeout(function() {
            successMessage.style.display = 'none';
        }, 5000);
    }
    
    // Function to show error message
    function showError(message) {
        // Update error message text if provided
        if (message) {
            errorMessage.textContent = message;
        }
        
        // Hide success message if visible
        successMessage.style.display = 'none';
        
        // Show error message
        errorMessage.style.display = 'block';
        
        // Hide error message after 5 seconds
        setTimeout(function() {
            errorMessage.style.display = 'none';
        }, 5000);
    }

    // Mobile menu toggle functionality
    const menuIcon = document.querySelector('.menu-icon');
    const navMenu = document.querySelector('nav ul');
    
    if (menuIcon && navMenu) {
        menuIcon.addEventListener('click', function() {
            navMenu.classList.toggle('show');
        });
    }
});

// Add active class to current navigation item
document.addEventListener('DOMContentLoaded', function() {
    const currentLocation = window.location.pathname;
    const navLinks = document.querySelectorAll('nav ul li a');
    
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        
        // Check if the current page matches the link
        if (currentLocation.includes(linkPath) && linkPath !== '#') {
            link.classList.add('active');
        }
    });
});
