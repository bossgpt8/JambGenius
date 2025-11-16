// Suppress Tailwind CDN warning in console
(function() {
    const originalWarn = console.warn;
    console.warn = function(...args) {
        // Filter out Tailwind CDN warning
        if (args[0] && typeof args[0] === 'string' && args[0].includes('cdn.tailwindcss.com should not be used in production')) {
            return;
        }
        // Pass through all other warnings
        originalWarn.apply(console, args);
    };
})();
