// Custom Modal System - Replaces alerts with beautiful modals
class CustomModal {
    constructor() {
        this.modalCreated = false;
        // Ensure DOM is ready before creating modal
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createModalHTML());
        } else {
            this.createModalHTML();
        }
    }

    createModalHTML() {
        if (this.modalCreated || document.getElementById('customModalOverlay')) return;
        if (!document.body) {
            setTimeout(() => this.createModalHTML(), 100);
            return;
        }
        
        const html = `
            <div id="customModalOverlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] hidden backdrop-blur-sm">
                <div id="customModalContent" class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in fade-in zoom-in duration-300">
                    <div id="customModalHeader" class="px-6 pt-6 pb-3">
                        <h2 id="customModalTitle" class="text-xl font-bold text-gray-900"></h2>
                    </div>
                    <div id="customModalBody" class="px-6 pb-6">
                        <p id="customModalMessage" class="text-gray-600 leading-relaxed"></p>
                    </div>
                    <div id="customModalFooter" class="px-6 pb-6 flex gap-3">
                        <button id="customModalBtn" class="flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all"></button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        this.modalCreated = true;
    }

    show(message, title = 'Message', type = 'info', buttons = ['OK']) {
        return new Promise((resolve) => {
            // Ensure modal exists
            if (!this.modalCreated) {
                this.createModalHTML();
            }

            const overlay = document.getElementById('customModalOverlay');
            if (!overlay) {
                console.error('Modal overlay not found');
                resolve(0);
                return;
            }

            const modalContent = document.getElementById('customModalContent');
            const titleEl = document.getElementById('customModalTitle');
            const messageEl = document.getElementById('customModalMessage');
            const footerEl = document.getElementById('customModalFooter');
            const headerEl = document.getElementById('customModalHeader');

            titleEl.textContent = title;
            messageEl.textContent = message;

            // Set colors based on type
            let headerClass = 'bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200';
            let btnClass = 'bg-blue-600 hover:bg-blue-700 text-white';
            let iconClass = 'fas fa-info-circle text-blue-600';

            if (type === 'success') {
                headerClass = 'bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200';
                btnClass = 'bg-green-600 hover:bg-green-700 text-white';
                iconClass = 'fas fa-check-circle text-green-600';
            } else if (type === 'error') {
                headerClass = 'bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200';
                btnClass = 'bg-red-600 hover:bg-red-700 text-white';
                iconClass = 'fas fa-exclamation-circle text-red-600';
            } else if (type === 'warning') {
                headerClass = 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-b border-yellow-200';
                btnClass = 'bg-yellow-600 hover:bg-yellow-700 text-white';
                iconClass = 'fas fa-exclamation-triangle text-yellow-600';
            }

            headerEl.className = `px-6 pt-6 pb-3 flex items-center gap-3 ${headerClass}`;
            titleEl.innerHTML = `<i class="${iconClass} mr-2"></i>${title}`;

            footerEl.innerHTML = buttons.map((btn, idx) => `
                <button class="flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                    idx === 0 ? btnClass : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }" data-btn="${idx}">${btn}</button>
            `).join('');

            const btns = footerEl.querySelectorAll('button');
            btns.forEach((btn, idx) => {
                btn.addEventListener('click', () => {
                    overlay.classList.add('hidden');
                    resolve(idx);
                });
            });

            overlay.classList.remove('hidden');
        });
    }

    info(message, title = 'Information') {
        return this.show(message, title, 'info');
    }

    success(message, title = 'Success') {
        return this.show(message, title, 'success');
    }

    error(message, title = 'Error') {
        return this.show(message, title, 'error');
    }

    warning(message, title = 'Warning') {
        return this.show(message, title, 'warning');
    }

    confirm(message, title = 'Confirm') {
        return this.show(message, title, 'warning', ['Cancel', 'OK']);
    }
}

// Create global instance
const customModal = new CustomModal();
