import { useState, useEffect, useCallback, useRef } from 'react';
import autoCompleteService, { AutoCompleteContext, AutoCompleteResponse } from '../services/autoCompleteService';
import { useToast } from './use-toast';

export interface UseAutoCompleteOptions {
  apiKey: string;
  debounceMs?: number;
  minContextLength?: number;
  enabled?: boolean;
}

export interface AutoCompleteSuggestion {
  text: string;
  id: string;
}

export interface UseAutoCompleteReturn {
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  suggestions: AutoCompleteSuggestion[];
  isLoading: boolean;
  error: string | null;
  getSuggestions: (context: AutoCompleteContext) => Promise<void>;
  clearSuggestions: () => void;
  cancelRequest: () => void;
  acceptSuggestion: (suggestion: AutoCompleteSuggestion) => void;
  cacheStats: { size: number; maxSize: number };
}

const STORAGE_KEY = 'markdown-editor-autocomplete-enabled';

export const useAutoComplete = (options: UseAutoCompleteOptions): UseAutoCompleteReturn => {
  const { apiKey, debounceMs = 500, minContextLength = 10, enabled: initialEnabled = true } = options;
  const { toast } = useToast();
  
  // State
  const [isEnabled, setIsEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : initialEnabled;
  });
  
  const [suggestions, setSuggestions] = useState<AutoCompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState({ size: 0, maxSize: 100 });
  
  // Refs
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestIdRef = useRef<string>('');
  const isInitializedRef = useRef<boolean>(false);
  
  // Initialize service when apiKey changes
  useEffect(() => {
    if (apiKey && apiKey.trim()) {
      const success = autoCompleteService.initialize({ apiKey });
      isInitializedRef.current = success;
      
      if (!success) {
        setError('Failed to initialize AutoComplete service');
        toast({
          title: 'AutoComplete Error',
          description: 'Failed to initialize AutoComplete service. Please check your API key.',
          variant: 'destructive',
        });
      } else {
        setError(null);
      }
    } else {
      isInitializedRef.current = false;
    }
  }, [apiKey, toast]);
  
  // Update cache stats periodically
  useEffect(() => {
    const updateStats = () => {
      setCacheStats(autoCompleteService.getCacheStats());
    };
    
    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // Persist enabled state
  const setIsEnabled = useCallback((enabled: boolean) => {
    setIsEnabledState(enabled);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled));
    
    if (!enabled) {
      // Clear suggestions and cancel any pending requests when disabled
      setSuggestions([]);
      autoCompleteService.cancelCurrentRequest();
      setIsLoading(false);
    }
  }, []);
  
  // Toggle enabled state
  const toggleEnabled = useCallback(() => {
    setIsEnabled(!isEnabled);
  }, [isEnabled, setIsEnabled]);
  
  // Generate unique suggestion IDs
  const generateSuggestionId = useCallback((text: string, index: number): string => {
    return `suggestion-${Date.now()}-${index}-${text.slice(0, 10).replace(/\s/g, '')}`;
  }, []);
  
  // Main function to get suggestions
  const getSuggestions = useCallback(async (context: AutoCompleteContext) => {
    // Early returns
    if (!isEnabled || !isInitializedRef.current) {
      return;
    }
    
    // Use new property with fallback to legacy one
    const textBeforeCursor = context.textBeforeCursor || context.contextBefore || '';
    if (textBeforeCursor.length < minContextLength) {
      setSuggestions([]);
      return;
    }
    
    // Generate request ID to handle race conditions
    const requestId = `${Date.now()}-${Math.random()}`;
    lastRequestIdRef.current = requestId;
    
    // Clear previous debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Debounce the request
    debounceTimeoutRef.current = setTimeout(async () => {
      // Check if this is still the latest request
      if (lastRequestIdRef.current !== requestId) {
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🔍 useAutoComplete: Requesting suggestions...', {
          contextLength: textBeforeCursor.length,
          cursorPosition: context.cursorPosition
        });
        
        const response: AutoCompleteResponse = await autoCompleteService.getSuggestions(context);
        
        // Check if this is still the latest request
        if (lastRequestIdRef.current !== requestId) {
          return;
        }
        
        if (response.success) {
          const suggestionObjects: AutoCompleteSuggestion[] = response.suggestions.map((text, index) => ({
            text,
            id: generateSuggestionId(text, index)
          }));
          
          setSuggestions(suggestionObjects);
          setError(null);
          
          console.log('✅ useAutoComplete: Suggestions received:', {
            count: suggestionObjects.length,
            suggestions: suggestionObjects.map(s => s.text.slice(0, 30) + '...')
          });
        } else {
          setSuggestions([]);
          setError(response.error || 'Failed to get suggestions');
          
          if (response.error && !response.error.includes('Rate limit')) {
            toast({
              title: 'AutoComplete Error',
              description: response.error,
              variant: 'destructive',
            });
          }
        }
      } catch (err) {
        // Check if this is still the latest request
        if (lastRequestIdRef.current !== requestId) {
          return;
        }
        
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setSuggestions([]);
        
        console.error('❌ useAutoComplete: Error:', err);
        
        if (!errorMessage.includes('cancelled') && !errorMessage.includes('Rate limit')) {
          toast({
            title: 'AutoComplete Error',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);
  }, [isEnabled, minContextLength, debounceMs, generateSuggestionId, toast]);
  
  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
    
    // Clear any pending debounced requests
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, []);
  
  // Cancel current request
  const cancelRequest = useCallback(() => {
    autoCompleteService.cancelCurrentRequest();
    setIsLoading(false);
    
    // Clear any pending debounced requests
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, []);
  
  // Accept suggestion (placeholder for now, actual implementation will be in the component)
  const acceptSuggestion = useCallback((suggestion: AutoCompleteSuggestion) => {
    console.log('✅ useAutoComplete: Suggestion accepted:', suggestion.text.slice(0, 30) + '...');
    clearSuggestions();
  }, [clearSuggestions]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      autoCompleteService.cancelCurrentRequest();
    };
  }, []);
  
  return {
    isEnabled,
    setIsEnabled,
    toggleEnabled,
    suggestions,
    isLoading,
    error,
    getSuggestions,
    clearSuggestions,
    cancelRequest,
    acceptSuggestion,
    cacheStats
  };
};

export default useAutoComplete;