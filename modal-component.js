class CustomModal {
    constructor() {
        this.modalContainer = null;
        this.initializeContainer();
    }

    initializeContainer() {
        if (this.modalContainer) return;

        this.modalContainer = document.createElement('div');
        this.modalContainer.id = 'customModalContainer';
        this.modalContainer.className = 'custom-modal-container';
        document.body.appendChild(this.modalContainer);
    }

    show({ title, message, type = 'info', buttons = [{ text: 'OK', action: null, primary: true }] }) {
        return new Promise((resolve) => {
            const iconConfig = {
                success: { icon: 'fa-check-circle', color: 'green', bgColor: 'bg-green-100' },
                error: { icon: 'fa-exclamation-circle', color: 'red', bgColor: 'bg-red-100' },
                warning: { icon: 'fa-exclamation-triangle', color: 'orange', bgColor: 'bg-orange-100' },
                info: { icon: 'fa-info-circle', color: 'blue', bgColor: 'bg-blue-100' }
            };

            const config = iconConfig[type] || iconConfig.info;

            const modalHTML = `
                <div class="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
                    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-slideUp">
                        <div class="p-8">
                            <div class="text-center mb-6">
                                <div class="inline-flex items-center justify-center w-16 h-16 ${config.bgColor} rounded-full mb-4">
                                    <i class="fas ${config.icon} text-3xl text-${config.color}-600"></i>
                                </div>
                                ${title ? `<h3 class="text-2xl font-bold text-gray-900 mb-2">${title}</h3>` : ''}
                                <p class="text-gray-600 text-base leading-relaxed">${message}</p>
                            </div>
                            <div class="flex flex-col space-y-2">
                                ${buttons.map((btn, index) => `
                                    <button 
                                        class="modal-btn-${index} w-full py-3 rounded-lg font-semibold transition-all transform hover:scale-105 ${
                                            btn.primary 
                                                ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg' 
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }"
                                    >
                                        ${btn.text}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.modalContainer.innerHTML = modalHTML;

            const modalElement = this.modalContainer.firstElementChild;
            
            buttons.forEach((btn, index) => {
                const btnElement = modalElement.querySelector(`.modal-btn-${index}`);
                btnElement.addEventListener('click', () => {
                    this.close();
                    if (btn.action) btn.action();
                    resolve(btn.value !== undefined ? btn.value : true);
                });
            });

            modalElement.addEventListener('click', (e) => {
                if (e.target === modalElement) {
                    this.close();
                    resolve(false);
                }
            });
        });
    }

    alert(message, title = '', type = 'info') {
        return this.show({
            title: title || 'JambGenius',
            message,
            type,
            buttons: [{ text: 'OK', action: null, primary: true }]
        });
    }

    confirm(message, title = 'Confirm') {
        return this.show({
            title,
            message,
            type: 'warning',
            buttons: [
                { text: 'Cancel', action: null, primary: false, value: false },
                { text: 'Confirm', action: null, primary: true, value: true }
            ]
        });
    }

    success(message, title = 'Success!') {
        return this.show({
            title,
            message,
            type: 'success',
            buttons: [{ text: 'OK', action: null, primary: true }]
        });
    }

    error(message, title = 'Error') {
        return this.show({
            title,
            message,
            type: 'error',
            buttons: [{ text: 'OK', action: null, primary: true }]
        });
    }

    close() {
        if (this.modalContainer) {
            this.modalContainer.innerHTML = '';
        }
    }
}

const customModal = new CustomModal();

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }
    
    .animate-fadeIn {
        animation: fadeIn 0.2s ease-out;
    }
    
    .animate-slideUp {
        animation: slideUp 0.3s ease-out;
    }
`;
document.head.appendChild(style);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = customModal;
}
