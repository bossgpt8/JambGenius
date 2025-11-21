// AI Helper - Get explanations for answers using Gemini
class AIHelper {
  constructor() {
    this.isLoading = false;
  }

  // Get AI explanation for a question
  async getExplanation(question, options, correctAnswer, userAnswer = null) {
    this.isLoading = true;

    try {
      const response = await fetch('/api/gemini-explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: question,
          options: options,
          correctAnswer: correctAnswer,
          userAnswer: userAnswer
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get explanation');
      }

      const data = await response.json();

      if (data.success) {
        return data.explanation;
      } else {
        return 'Could not generate explanation. Please try again.';
      }
    } catch (error) {
      console.error('Error getting AI explanation:', error);
      return 'Error: Could not connect to AI service. Please try again later.';
    } finally {
      this.isLoading = false;
    }
  }

  // Show explanation in a modal
  static showExplanationModal(explanation) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-900">💡 AI Explanation</h3>
          <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('div').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <p class="text-gray-700 mb-4">${explanation}</p>
        <button class="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-colors" onclick="this.closest('div').remove()">
          Got it!
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  }
}

if (typeof window !== 'undefined') {
  window.aiHelper = new AIHelper();
}
