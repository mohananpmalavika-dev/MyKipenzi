import { useState, useEffect, useCallback, useRef } from 'react';
import { Calculator as CalcIcon, Lock, Unlock, EyeOff } from 'lucide-react';

const SECRET_PIN = '1234';

export function StealthDisguise({ isActive, onDeactivate, user }) {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [secretBuffer, setSecretBuffer] = useState('');
  const [tapCount, setTapCount] = useState(0);

  const originalTitleRef = useRef(document.title);
  const originalFaviconRef = useRef('');

  // Handle disguise title & favicon change
  useEffect(() => {
    if (isActive) {
      originalTitleRef.current = document.title;
      document.title = 'Calculator';

      // Save and replace favicon
      const link = document.querySelector("link[rel*='icon']");
      if (link) {
        originalFaviconRef.current = link.href;
        link.href =
          'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧮</text></svg>';
      }
    } else {
      document.title = originalTitleRef.current || 'Kipenzi Connect';
      const link = document.querySelector("link[rel*='icon']");
      if (link && originalFaviconRef.current) {
        link.href = originalFaviconRef.current;
      }
    }

    return () => {
      document.title = originalTitleRef.current || 'Kipenzi Connect';
      const link = document.querySelector("link[rel*='icon']");
      if (link && originalFaviconRef.current) {
        link.href = originalFaviconRef.current;
      }
    };
  }, [isActive]);

  // Calculator button actions
  const inputDigit = (digit) => {
    setSecretBuffer((prev) => (prev + digit).slice(-6));
    if (waitingForOperand) {
      setDisplay(String(digit));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? String(digit) : display + digit);
    }
  };

  const inputDot = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clearAll = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(false);
    setSecretBuffer('');
  };

  const performOperation = (nextOp) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (operation) {
      const current = prevValue || 0;
      let newValue = current;
      if (operation === '+') newValue = current + inputValue;
      else if (operation === '-') newValue = current - inputValue;
      else if (operation === '×') newValue = current * inputValue;
      else if (operation === '÷') newValue = inputValue !== 0 ? current / inputValue : 'Error';

      setPrevValue(newValue);
      setDisplay(String(newValue));
    }

    setWaitingForOperand(true);
    setOperation(nextOp);
  };

  const handleEquals = () => {
    // Check if secret PIN was entered right before '='
    if (secretBuffer === SECRET_PIN || display === SECRET_PIN) {
      onDeactivate();
      return;
    }

    if (!operation || prevValue === null) return;
    const inputValue = parseFloat(display);
    let result = 0;
    if (operation === '+') result = prevValue + inputValue;
    else if (operation === '-') result = prevValue - inputValue;
    else if (operation === '×') result = prevValue * inputValue;
    else if (operation === '÷') result = inputValue !== 0 ? prevValue / inputValue : 'Error';

    setDisplay(String(result));
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const toggleSign = () => {
    const val = parseFloat(display);
    setDisplay(String(val * -1));
  };

  const inputPercent = () => {
    const val = parseFloat(display);
    setDisplay(String(val / 100));
  };

  // Secret triple tap on header
  const handleHeaderTap = () => {
    setTapCount((c) => {
      const next = c + 1;
      if (next >= 3) {
        onDeactivate();
        return 0;
      }
      return next;
    });
    setTimeout(() => setTapCount(0), 1500);
  };

  if (!isActive) return null;

  return (
    <div
      className="stealth-disguise-overlay animate-fade-in"
      role="application"
      aria-label="Calculator"
    >
      <div className="stealth-calculator-frame">
        {/* Disguise Top Bar */}
        <div className="calc-header" onClick={handleHeaderTap} title="Tap 3 times to unlock">
          <div className="calc-header-brand">
            <CalcIcon size={16} />
            <span>Standard Calculator</span>
          </div>
          <button
            type="button"
            className="discreet-exit-btn"
            onClick={onDeactivate}
            title="Unlock app (PIN is 1234=)"
          >
            <Lock size={14} />
          </button>
        </div>

        {/* Calculator Display */}
        <div className="calc-display-screen">
          <div className="calc-display-formula">
            {prevValue !== null && `${prevValue} ${operation || ''}`}
          </div>
          <div className="calc-display-value">{display}</div>
        </div>

        {/* Calculator Keypad */}
        <div className="calc-keypad-grid">
          <button type="button" className="calc-btn fn" onClick={clearAll}>
            AC
          </button>
          <button type="button" className="calc-btn fn" onClick={toggleSign}>
            ±
          </button>
          <button type="button" className="calc-btn fn" onClick={inputPercent}>
            %
          </button>
          <button
            type="button"
            className={`calc-btn op ${operation === '÷' ? 'active' : ''}`}
            onClick={() => performOperation('÷')}
          >
            ÷
          </button>

          <button type="button" className="calc-btn num" onClick={() => inputDigit(7)}>
            7
          </button>
          <button type="button" className="calc-btn num" onClick={() => inputDigit(8)}>
            8
          </button>
          <button type="button" className="calc-btn num" onClick={() => inputDigit(9)}>
            9
          </button>
          <button
            type="button"
            className={`calc-btn op ${operation === '×' ? 'active' : ''}`}
            onClick={() => performOperation('×')}
          >
            ×
          </button>

          <button type="button" className="calc-btn num" onClick={() => inputDigit(4)}>
            4
          </button>
          <button type="button" className="calc-btn num" onClick={() => inputDigit(5)}>
            5
          </button>
          <button type="button" className="calc-btn num" onClick={() => inputDigit(6)}>
            6
          </button>
          <button
            type="button"
            className={`calc-btn op ${operation === '-' ? 'active' : ''}`}
            onClick={() => performOperation('-')}
          >
            -
          </button>

          <button type="button" className="calc-btn num" onClick={() => inputDigit(1)}>
            1
          </button>
          <button type="button" className="calc-btn num" onClick={() => inputDigit(2)}>
            2
          </button>
          <button type="button" className="calc-btn num" onClick={() => inputDigit(3)}>
            3
          </button>
          <button
            type="button"
            className={`calc-btn op ${operation === '+' ? 'active' : ''}`}
            onClick={() => performOperation('+')}
          >
            +
          </button>

          <button type="button" className="calc-btn num zero" onClick={() => inputDigit(0)}>
            0
          </button>
          <button type="button" className="calc-btn num" onClick={inputDot}>
            .
          </button>
          <button type="button" className="calc-btn op equals" onClick={handleEquals}>
            =
          </button>
        </div>

        {/* Discreet PIN Hint */}
        <div className="calc-footer-hint">
          <span>Tip: Type 1234= to return to Kipenzi</span>
        </div>
      </div>
    </div>
  );
}
