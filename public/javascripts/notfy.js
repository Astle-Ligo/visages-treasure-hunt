document.addEventListener("DOMContentLoaded", function () {
    const notyf = new Notyf({
        duration: 3000,
        position: { x: "right", y: "top" }
    });

    // Get messages from data attributes
    const successMessage = document.body.dataset.success;
    const errorMessage = document.body.dataset.error;

    // Show notifications if messages exist
    if (successMessage) {
        notyf.success(successMessage);
    }
    if (errorMessage) {
        notyf.error(errorMessage);
    }
});