// Hide footer in mobile app wrapper
if (typeof appDetector !== 'undefined' && appDetector.isApp) {
    document.addEventListener('DOMContentLoaded', () => {
        const footer = document.querySelector('footer');
        if (footer) footer.style.display = 'none';
    });
}
