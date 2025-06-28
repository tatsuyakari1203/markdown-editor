import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '../lib/utils';
import { AutoCompleteSuggestion } from '../hooks/useAutoComplete';
import { Loader2, Sparkles } from 'lucide-react';

export interface AutoCompletePopupProps {
  suggestions: AutoCompleteSuggestion[];
  isLoading: boolean;
  position: { x: number; y: number };
  onSelect: (suggestion: AutoCompleteSuggestion) => void;
  onClose: () => void;
  isDarkMode: boolean;
  visible?: boolean;
  className?: string;
}

const AutoCompletePopup: React.FC<AutoCompletePopupProps> = ({
  suggestions,
  isLoading,
  position,
  onSelect,
  onClose,
  isDarkMode,
  visible = true,
  className
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
    suggestionRefs.current = suggestionRefs.current.slice(0, suggestions.length);
  }, [suggestions]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < suggestionRefs.current.length) {
      const selectedElement = suggestionRefs.current[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!visible || suggestions.length === 0) return;

    // Handle different key combinations for better compatibility
    const key = event.key;
    const isCtrl = event.ctrlKey;
    const isAlt = event.altKey;
    
    // Define handled keys with modifiers
    const shouldHandle = (
      key === 'ArrowDown' || key === 'ArrowUp' ||
      key === 'Tab' || key === 'Enter' || key === 'Escape' ||
      (isCtrl && (key === 'j' || key === 'k')) || // Vim-style navigation
      (isCtrl && key === 'n') || (isCtrl && key === 'p') || // Emacs-style
      key === 'PageDown' || key === 'PageUp'
    );

    if (shouldHandle) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    switch (true) {
      // Navigation: Down
      case key === 'ArrowDown' || (isCtrl && key === 'j') || (isCtrl && key === 'n') || key === 'PageDown':
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
        
      // Navigation: Up  
      case key === 'ArrowUp' || (isCtrl && key === 'k') || (isCtrl && key === 'p') || key === 'PageUp':
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
        
      // Accept suggestion
      case key === 'Tab' || key === 'Enter':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          onSelect(suggestions[selectedIndex]);
        } else if (suggestions.length > 0) {
          // If no selection, use first suggestion
          onSelect(suggestions[0]);
        }
        break;
        
      // Close popup
      case key === 'Escape':
        onClose();
        break;
    }
  }, [visible, suggestions, selectedIndex, onSelect, onClose]);

  // Add keyboard event listener with high priority
  useEffect(() => {
    if (visible) {
      // Use capture phase to intercept events before Monaco Editor
      document.addEventListener('keydown', handleKeyDown, true);
      // Also add to window for better coverage
      window.addEventListener('keydown', handleKeyDown, true);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
        window.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [visible, handleKeyDown]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [visible, onClose]);

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  // Calculate popup position with viewport bounds checking
  const getPopupStyle = (): React.CSSProperties => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = 320; // Estimated popup width
    const popupHeight = Math.min(suggestions.length * 60 + 40, 300); // Estimated popup height

    let left = position.x;
    let top = position.y + 20; // Offset below cursor

    // Adjust horizontal position if popup would overflow
    if (left + popupWidth > viewportWidth) {
      left = viewportWidth - popupWidth - 10;
    }
    if (left < 10) {
      left = 10;
    }

    // Adjust vertical position if popup would overflow
    if (top + popupHeight > viewportHeight) {
      top = position.y - popupHeight - 10; // Show above cursor
    }
    if (top < 10) {
      top = 10;
    }

    return {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      zIndex: 9999
    };
  };

  return (
    <div
        ref={popupRef}
        style={getPopupStyle()}
        className={cn(
          'w-80 max-w-sm max-h-64 overflow-y-auto',
          'backdrop-blur-sm rounded-xl shadow-xl border',
          'animate-in fade-in-0 slide-in-from-bottom-2 duration-150',
          isDarkMode 
            ? 'bg-gray-900/95 border-gray-700/50 shadow-black/20' 
            : 'bg-white/95 border-gray-200/50 shadow-gray-900/10',
          className
        )}
      >
      {/* Header */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2.5 border-b",
        isDarkMode ? "border-gray-700/40" : "border-gray-200/40"
      )}>
        <Sparkles className="h-4 w-4 text-blue-500 flex-shrink-0" />
        <span className={cn(
          "text-sm font-medium flex-1",
          isDarkMode ? "text-gray-200" : "text-gray-700"
        )}>
          AI Suggestions
        </span>
        {isLoading && (
          <Loader2 className={cn(
            "h-3.5 w-3.5 animate-spin",
            isDarkMode ? "text-gray-400" : "text-gray-500"
          )} />
        )}
        <span className={cn(
          "text-xs px-1.5 py-0.5 rounded-md font-mono",
          isDarkMode ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500"
        )}>
          ↑↓ Tab ⏎ | Ctrl+J/K | Ctrl+N/P | PgUp/PgDn
        </span>
      </div>

      {/* Content */}
      <div className="p-2">
        {isLoading && suggestions.length === 0 ? (
          <div className={cn(
            "flex items-center justify-center py-8",
            isDarkMode ? "text-gray-400" : "text-gray-500"
          )}>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Generating suggestions...</span>
          </div>
        ) : suggestions.length === 0 ? (
          <div className={cn(
            "flex items-center justify-center py-8",
            isDarkMode ? "text-gray-400" : "text-gray-500"
          )}>
            <span className="text-sm">No suggestions available</span>
          </div>
        ) : (
          <div className="space-y-0.5 p-1">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                ref={el => suggestionRefs.current[index] = el}
                className={cn(
                  'px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150',
                  'border border-transparent group relative',
                  isDarkMode 
                    ? 'hover:bg-gray-800/60 active:bg-gray-800/80' 
                    : 'hover:bg-gray-50 active:bg-gray-100',
                  selectedIndex === index && [
                    isDarkMode 
                      ? 'bg-blue-900/30 border-blue-700/30 shadow-lg shadow-blue-900/10' 
                      : 'bg-blue-50 border-blue-200/50 shadow-lg shadow-blue-900/5',
                    'ring-1',
                    isDarkMode ? 'ring-blue-700/20' : 'ring-blue-200/30'
                  ]
                )}
                onClick={() => onSelect(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className={cn(
                  "text-sm leading-relaxed break-words",
                  selectedIndex === index 
                    ? (isDarkMode ? "text-blue-100" : "text-blue-900")
                    : (isDarkMode ? "text-gray-200" : "text-gray-800")
                )}>
                  {suggestion.text}
                </div>
                {selectedIndex === index && (
                  <div className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono opacity-60",
                    isDarkMode ? "text-blue-300" : "text-blue-600"
                  )}>
                    ⏎
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with keyboard hints */}
      {suggestions.length > 0 && (
        <div className={cn(
          "px-3 py-2 border-t",
          isDarkMode 
            ? "border-gray-600/30 bg-gray-700/30" 
            : "border-gray-200/30 bg-gray-50/30"
        )}>
          <div className={cn(
            "flex items-center justify-between text-xs",
            isDarkMode ? "text-gray-400" : "text-gray-500"
          )}>
            <span>↑↓ Navigate</span>
            <span>Tab/Enter Accept</span>
            <span>Esc Close</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoCompletePopup;