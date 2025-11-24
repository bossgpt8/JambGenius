// Scientific Calculator for JAMB Exams
// Used for Mathematics, Physics, and Chemistry subjects

class Calculator {
    constructor() {
        this.display = '';
        this.history = [];
        this.memory = 0;
        this.isOpen = false;
        this.createCalculator();
    }

    createCalculator() {
        const calculatorHTML = `
            <div id="calculator" class="calculator-container" style="display: none;">
                <div class="calculator-header">
                    <span class="calculator-title">
                        <i class="fas fa-calculator"></i> Calculator
                    </span>
                    <div class="calculator-controls">
                        <button class="calc-minimize" title="Minimize">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button class="calc-close" title="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="calculator-body">
                    <div class="calculator-display">
                        <div class="display-history" id="calcHistory"></div>
                        <input type="text" class="display-current" id="calcDisplay" value="0" readonly>
                    </div>
                    <div class="calculator-buttons">
                        <!-- Memory and Clear Row -->
                        <button class="calc-btn memory" data-action="mc">MC</button>
                        <button class="calc-btn memory" data-action="mr">MR</button>
                        <button class="calc-btn memory" data-action="m+">M+</button>
                        <button class="calc-btn memory" data-action="m-">M-</button>
                        
                        <!-- Functions Row 1 -->
                        <button class="calc-btn function" data-action="sqrt">√</button>
                        <button class="calc-btn function" data-action="pow">x²</button>
                        <button class="calc-btn function" data-action="pow3">x³</button>
                        <button class="calc-btn function" data-action="reciprocal">1/x</button>
                        
                        <!-- Functions Row 2 -->
                        <button class="calc-btn function" data-action="sin">sin</button>
                        <button class="calc-btn function" data-action="cos">cos</button>
                        <button class="calc-btn function" data-action="tan">tan</button>
                        <button class="calc-btn function" data-action="log">log</button>
                        
                        <!-- Main Calculator Buttons -->
                        <button class="calc-btn clear" data-action="clear">C</button>
                        <button class="calc-btn clear" data-action="backspace">⌫</button>
                        <button class="calc-btn operator" data-value="%">%</button>
                        <button class="calc-btn operator" data-value="/">÷</button>
                        
                        <button class="calc-btn number" data-value="7">7</button>
                        <button class="calc-btn number" data-value="8">8</button>
                        <button class="calc-btn number" data-value="9">9</button>
                        <button class="calc-btn operator" data-value="*">×</button>
                        
                        <button class="calc-btn number" data-value="4">4</button>
                        <button class="calc-btn number" data-value="5">5</button>
                        <button class="calc-btn number" data-value="6">6</button>
                        <button class="calc-btn operator" data-value="-">-</button>
                        
                        <button class="calc-btn number" data-value="1">1</button>
                        <button class="calc-btn number" data-value="2">2</button>
                        <button class="calc-btn number" data-value="3">3</button>
                        <button class="calc-btn operator" data-value="+">+</button>
                        
                        <button class="calc-btn number" data-value="0">0</button>
                        <button class="calc-btn number" data-value=".">.</button>
                        <button class="calc-btn operator" data-value="(">(</button>
                        <button class="calc-btn operator" data-value=")">)</button>
                        
                        <button class="calc-btn equals" data-action="equals" style="grid-column: span 4;">=</button>
                    </div>
                </div>
            </div>
        `;

        const style = `
            <style>
                .calculator-container {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 280px;
                    max-height: 50vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 16px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    z-index: 9999;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    user-select: none;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .calculator-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 14px;
                    background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(10px);
                    cursor: move;
                    flex-shrink: 0;
                }

                .calculator-title {
                    color: white;
                    font-weight: 600;
                    font-size: 13px;
                }

                .calculator-controls {
                    display: flex;
                    gap: 4px;
                }

                .calc-minimize, .calc-close {
                    background: rgba(255,255,255,0.25);
                    border: none;
                    color: white;
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    transition: all 0.2s;
                    font-weight: bold;
                }

                .calc-minimize:hover, .calc-close:hover {
                    background: rgba(255,255,255,0.4);
                    transform: scale(1.05);
                }

                .calc-close {
                    background: rgba(239, 68, 68, 0.3);
                }

                .calc-close:hover {
                    background: rgba(239, 68, 68, 0.5);
                }

                .calculator-body {
                    padding: 12px;
                    background: white;
                    flex: 1;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                }

                .calculator-display {
                    background: #f8f9fa;
                    border-radius: 10px;
                    padding: 12px;
                    margin-bottom: 12px;
                    min-height: 50px;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                    flex-shrink: 0;
                }

                .display-history {
                    font-size: 10px;
                    color: #6c757d;
                    min-height: 14px;
                    margin-bottom: 4px;
                    text-align: right;
                }

                .display-current {
                    background: transparent;
                    border: none;
                    font-size: 24px;
                    font-weight: 600;
                    color: #212529;
                    text-align: right;
                    outline: none;
                    width: 100%;
                }

                .calculator-buttons {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 6px;
                }

                .calc-btn {
                    border: none;
                    border-radius: 7px;
                    font-size: 13px;
                    font-weight: 500;
                    padding: 10px 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                    outline: none;
                    min-height: 32px;
                }

                .calc-btn:active {
                    transform: scale(0.95);
                }

                .calc-btn.number {
                    background: #e9ecef;
                    color: #212529;
                }

                .calc-btn.number:hover {
                    background: #dee2e6;
                }

                .calc-btn.operator {
                    background: #667eea;
                    color: white;
                }

                .calc-btn.operator:hover {
                    background: #5568d3;
                }

                .calc-btn.equals {
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    color: white;
                    font-size: 20px;
                }

                .calc-btn.equals:hover {
                    background: linear-gradient(135deg, #e082ea 0%, #e4465b 100%);
                }

                .calc-btn.clear {
                    background: #dc3545;
                    color: white;
                }

                .calc-btn.clear:hover {
                    background: #c82333;
                }

                .calc-btn.function {
                    background: #6c757d;
                    color: white;
                    font-size: 14px;
                }

                .calc-btn.function:hover {
                    background: #5a6268;
                }

                .calc-btn.memory {
                    background: #17a2b8;
                    color: white;
                    font-size: 14px;
                }

                .calc-btn.memory:hover {
                    background: #138496;
                }

                .calculator-toggle {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: none;
                    border-radius: 50%;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
                    z-index: 9998;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .calculator-toggle:hover {
                    transform: scale(1.1);
                    box-shadow: 0 15px 40px rgba(102, 126, 234, 0.5);
                }

                .calculator-toggle:active {
                    transform: scale(0.95);
                }

                @media (max-width: 768px) {
                    .calculator-container {
                        width: calc(100vw - 32px);
                        max-height: 45vh;
                        bottom: 16px;
                        right: 16px;
                        left: 16px;
                    }

                    .calculator-toggle {
                        width: 56px;
                        height: 56px;
                        font-size: 22px;
                        bottom: 16px;
                        right: 16px;
                    }

                    .calc-btn {
                        font-size: 12px;
                        padding: 8px 2px;
                        min-height: 28px;
                    }

                    .display-current {
                        font-size: 20px;
                    }
                }
            </style>
        `;

        // Add styles to document
        document.head.insertAdjacentHTML('beforeend', style);

        // Add calculator to document
        document.body.insertAdjacentHTML('beforeend', calculatorHTML);

        // Add toggle button
        const toggleButton = document.createElement('button');
        toggleButton.className = 'calculator-toggle';
        toggleButton.innerHTML = '<i class="fas fa-calculator"></i>';
        toggleButton.setAttribute('data-testid', 'button-calculator-toggle');
        document.body.appendChild(toggleButton);

        this.setupEventListeners();
    }

    setupEventListeners() {
        const calc = document.getElementById('calculator');
        const toggle = document.querySelector('.calculator-toggle');
        const closeBtn = document.querySelector('.calc-close');
        const minimizeBtn = document.querySelector('.calc-minimize');
        const buttons = document.querySelectorAll('.calc-btn');

        // Toggle calculator
        toggle.addEventListener('click', () => this.toggle());
        closeBtn.addEventListener('click', () => this.close());
        minimizeBtn.addEventListener('click', () => this.minimize());

        // Make calculator draggable
        this.makeDraggable(calc);

        // Button clicks
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.target.dataset.value;
                const action = e.target.dataset.action;

                if (value !== undefined) {
                    this.appendValue(value);
                } else if (action) {
                    this.performAction(action);
                }
            });
        });

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;

            if (e.key >= '0' && e.key <= '9' || e.key === '.') {
                this.appendValue(e.key);
            } else if (['+', '-', '*', '/', '%', '(', ')'].includes(e.key)) {
                this.appendValue(e.key);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.performAction('equals');
            } else if (e.key === 'Escape') {
                this.close();
            } else if (e.key === 'Backspace') {
                this.performAction('backspace');
            } else if (e.key.toLowerCase() === 'c') {
                this.performAction('clear');
            }
        });
    }

    toggle() {
        const calc = document.getElementById('calculator');
        const toggle = document.querySelector('.calculator-toggle');
        
        if (this.isOpen) {
            this.close();
        } else {
            calc.style.display = 'block';
            toggle.style.display = 'none';
            this.isOpen = true;
        }
    }

    close() {
        const calc = document.getElementById('calculator');
        const toggle = document.querySelector('.calculator-toggle');
        
        calc.style.display = 'none';
        toggle.style.display = 'flex';
        this.isOpen = false;
    }

    minimize() {
        this.close();
    }

    appendValue(value) {
        const display = document.getElementById('calcDisplay');
        if (display.value === '0' || display.value === 'Error') {
            display.value = value;
        } else {
            display.value += value;
        }
    }

    performAction(action) {
        const display = document.getElementById('calcDisplay');
        const history = document.getElementById('calcHistory');

        switch(action) {
            case 'clear':
                display.value = '0';
                history.textContent = '';
                break;

            case 'backspace':
                display.value = display.value.slice(0, -1) || '0';
                break;

            case 'equals':
                try {
                    history.textContent = display.value;
                    const result = this.evaluate(display.value);
                    display.value = this.formatNumber(result);
                    this.history.push({ expression: history.textContent, result: display.value });
                } catch (error) {
                    display.value = 'Error';
                }
                break;

            case 'sqrt':
                try {
                    const num = parseFloat(display.value);
                    display.value = this.formatNumber(Math.sqrt(num));
                } catch {
                    display.value = 'Error';
                }
                break;

            case 'pow':
                try {
                    const num = parseFloat(display.value);
                    display.value = this.formatNumber(Math.pow(num, 2));
                } catch {
                    display.value = 'Error';
                }
                break;

            case 'pow3':
                try {
                    const num = parseFloat(display.value);
                    display.value = this.formatNumber(Math.pow(num, 3));
                } catch {
                    display.value = 'Error';
                }
                break;

            case 'reciprocal':
                try {
                    const num = parseFloat(display.value);
                    display.value = this.formatNumber(1 / num);
                } catch {
                    display.value = 'Error';
                }
                break;

            case 'sin':
                try {
                    const num = parseFloat(display.value);
                    display.value = this.formatNumber(Math.sin(num * Math.PI / 180));
                } catch {
                    display.value = 'Error';
                }
                break;

            case 'cos':
                try {
                    const num = parseFloat(display.value);
                    display.value = this.formatNumber(Math.cos(num * Math.PI / 180));
                } catch {
                    display.value = 'Error';
                }
                break;

            case 'tan':
                try {
                    const num = parseFloat(display.value);
                    display.value = this.formatNumber(Math.tan(num * Math.PI / 180));
                } catch {
                    display.value = 'Error';
                }
                break;

            case 'log':
                try {
                    const num = parseFloat(display.value);
                    display.value = this.formatNumber(Math.log10(num));
                } catch {
                    display.value = 'Error';
                }
                break;

            case 'mc':
                this.memory = 0;
                break;

            case 'mr':
                display.value = this.formatNumber(this.memory);
                break;

            case 'm+':
                this.memory += parseFloat(display.value) || 0;
                break;

            case 'm-':
                this.memory -= parseFloat(display.value) || 0;
                break;
        }
    }

    evaluate(expression) {
        // Replace × and ÷ with * and /
        expression = expression.replace(/×/g, '*').replace(/÷/g, '/');
        
        // Safe evaluation using Function constructor
        return Function('"use strict"; return (' + expression + ')')();
    }

    formatNumber(num) {
        if (isNaN(num) || !isFinite(num)) return 'Error';
        
        // Round to 10 decimal places to avoid floating point errors
        const rounded = Math.round(num * 10000000000) / 10000000000;
        
        // If the number is very small or very large, use scientific notation
        if (Math.abs(rounded) < 0.0001 && rounded !== 0 || Math.abs(rounded) > 999999999) {
            return rounded.toExponential(6);
        }
        
        return rounded.toString();
    }

    makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const header = element.querySelector('.calculator-header');

        header.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            element.style.bottom = 'auto';
            element.style.right = 'auto';
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }
}

// Initialize calculator on subjects that need it
function initCalculatorForSubject() {
    const urlParams = new URLSearchParams(window.location.search);
    const subject = urlParams.get('subject');
    const subjects = urlParams.get('subjects');
    
    // Subjects that need calculator
    const calculatorSubjects = ['mathematics', 'physics', 'chemistry'];
    
    let needsCalculator = false;
    
    // Check if current subject needs calculator
    if (subject && calculatorSubjects.includes(subject.toLowerCase())) {
        needsCalculator = true;
    }
    
    // Check if any selected subjects need calculator (for exam mode)
    if (subjects) {
        const selectedSubjects = subjects.split(',');
        needsCalculator = selectedSubjects.some(s => calculatorSubjects.includes(s.toLowerCase()));
    }
    
    // Initialize calculator if needed
    if (needsCalculator) {
        new Calculator();
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCalculatorForSubject);
} else {
    initCalculatorForSubject();
}
