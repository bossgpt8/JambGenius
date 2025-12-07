// Floating AI Chat Button Component
// Include this script on any page to show the floating chat button

(function() {
  // Don't show on the chat page itself
  if (window.location.pathname.includes('chat.html')) {
    return;
  }

  // Create the floating button HTML
  const floatingButton = document.createElement('a');
  floatingButton.href = 'chat.html';
  floatingButton.className = 'fixed bottom-6 right-6 z-50 group';
  floatingButton.title = 'Chat with JambGenius AI';
  floatingButton.innerHTML = `
    <div class="relative">
      <div class="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-ping opacity-25"></div>
      <div class="relative w-14 h-14 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300">
        <i class="fas fa-comment-dots text-white text-2xl"></i>
      </div>
      <div class="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap shadow-lg pointer-events-none">
        Need help? Chat with AI
        <div class="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  `;

  // Add styles for the animation if not already present
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ping {
      75%, 100% {
        transform: scale(2);
        opacity: 0;
      }
    }
    .animate-ping {
      animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
  `;
  
  // Append to body when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      document.head.appendChild(style);
      document.body.appendChild(floatingButton);
    });
  } else {
    document.head.appendChild(style);
    document.body.appendChild(floatingButton);
  }
})();
