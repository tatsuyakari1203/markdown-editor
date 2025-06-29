import React, { useState } from 'react';
import { Wand2, RefreshCw, Loader2, Sparkles, Send, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from '../hooks/use-toast';
import geminiService from '../services/geminiService';

import { SmartPasteButton } from './SmartPasteButton';
import type { editor } from 'monaco-editor';

interface AIToolbarProps {
  editorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>;
  isDarkMode: boolean;
  apiKey: string;
  onRewriteInputToggle?: (isOpen: boolean) => void;
}

const AIToolbar: React.FC<AIToolbarProps> = ({ editorRef, isDarkMode, apiKey, onRewriteInputToggle }) => {
  const [isReformatting, setIsReformatting] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewritePrompt, setRewritePrompt] = useState('');
  const [isRewriteInputOpen, setIsRewriteInputOpen] = useState(false);
  const { toast } = useToast();

  const getSelectedText = (): { text: string; selection: any; context?: { beforeText: string; afterText: string; documentStructure: string } } | null => {
    const editor = editorRef.current;
    if (!editor) return null;

    const selection = editor.getSelection();
    if (!selection) return null;

    const model = editor.getModel();
    if (!model) return null;

    const selectedText = model.getValueInRange(selection) || '';
    
    // Get surrounding context for better rewriting
    const fullText = model.getValue();
    const selectionStart = model.getOffsetAt({
      lineNumber: selection.startLineNumber,
      column: selection.startColumn
    });
    const selectionEnd = model.getOffsetAt({
      lineNumber: selection.endLineNumber,
      column: selection.endColumn
    });
    
    // Get text before and after selection (up to 1000 chars each)
    const beforeText = fullText.substring(Math.max(0, selectionStart - 1000), selectionStart);
    const afterText = fullText.substring(selectionEnd, Math.min(fullText.length, selectionEnd + 1000));
    
    // Extract document structure (headings)
    const headings = fullText.match(/^#{1,6}\s+.+$/gm) || [];
    const documentStructure = headings.slice(0, 5).join('; ');
    
    return { 
      text: selectedText, 
      selection,
      context: {
        beforeText,
        afterText,
        documentStructure
      }
    };
  };

  const getAllText = (): string => {
    const editor = editorRef.current;
    if (!editor) return '';
    return editor.getValue();
  };

  const replaceText = (selection: any, newText: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.executeEdits('ai-toolbar', [{
      range: selection,
      text: newText,
      forceMoveMarkers: true
    }]);

    editor.focus();
  };

  const replaceAllText = (newText: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const fullRange = model.getFullModelRange();
    editor.executeEdits('ai-toolbar', [{
      range: fullRange,
      text: newText,
      forceMoveMarkers: true
    }]);

    editor.focus();
  };



  const handleReformat = async () => {
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please set your Gemini API key in settings first.",
        variant: "destructive",
      });
      return;
    }

    setIsReformatting(true);
    
    try {
      console.log('🔄 AIToolbar: Starting reformat process...');
      // Initialize Gemini service if not already done
      const initialized = await geminiService.ensureInitialized(apiKey);
      if (!initialized) {
        const error = geminiService.getLastError();
        console.error('❌ AIToolbar: Gemini service initialization failed:', error);
        toast({
          title: "Initialization Failed",
          description: error || "Failed to initialize Gemini service. Please check your API key.",
          variant: "destructive",
        });
        return;
      }
      console.log('✅ AIToolbar: Gemini service initialized successfully');

      const selectedData = getSelectedText();
      let textToReformat = '';
      let isFullDocument = false;

      if (selectedData && selectedData.text.trim()) {
        textToReformat = selectedData.text;
      } else {
        textToReformat = getAllText();
        isFullDocument = true;

        // Check if document is too long (more than 10000 characters)
        if (textToReformat.length > 10000) {
          toast({
            title: "Document Too Long",
            description: "Please select a specific section to reformat. Full document reformatting is limited to 10,000 characters.",
            variant: "destructive",
          });
          return;
        }
      }

      if (!textToReformat.trim()) {
        toast({
          title: "No Content",
          description: "Please select text to reformat or ensure the document has content.",
          variant: "destructive",
        });
        return;
      }

      console.log('🔄 AIToolbar: Calling geminiService.reformatMarkdown...');
      const result = await geminiService.reformatMarkdown(textToReformat);
      console.log('📝 AIToolbar: Reformat result:', { success: result.success, hasContent: !!result.content, error: result.error });

      if (result.success) {
        if (isFullDocument) {
          replaceAllText(result.content);
        } else if (selectedData) {
          replaceText(selectedData.selection, result.content);
        }

        console.log('✅ AIToolbar: Reformat completed successfully');
        toast({
          title: "✨ Reformatted Successfully",
          description: "Your markdown has been beautifully reformatted!",
        });
      } else {
        console.error('❌ AIToolbar: Reformat failed:', result.error);
        toast({
          title: "Reformat Failed",
          description: result.error || "Failed to reformat content",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ AIToolbar: Unexpected error during reformat:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while reformatting.",
        variant: "destructive",
      });
    } finally {
      console.log('🏁 AIToolbar: Reformat process finished');
      setIsReformatting(false);
    }
  };

  const toggleRewriteInput = () => {
    const newState = !isRewriteInputOpen;
    setIsRewriteInputOpen(newState);
    if (onRewriteInputToggle) {
      onRewriteInputToggle(newState);
    }
    if (!newState) {
      setRewritePrompt('');
    }
  };



  const handleSmartPaste = (text: string) => {
    const editor = editorRef.current;
    if (!editor || !text.trim()) return;

    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!model) return;

    // If there's a selection, replace it; otherwise insert at cursor position
    if (selection && !selection.isEmpty()) {
      // Replace selected text
      editor.executeEdits('smart-paste-insert', [{
        range: selection,
        text: text
      }]);
    } else {
      // Insert at cursor position
      const position = editor.getPosition();
      if (position) {
        editor.executeEdits('smart-paste-insert', [{
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          },
          text: text
        }]);
        
        // Move cursor to end of inserted text
        const lines = text.split('\n');
        const newPosition = {
          lineNumber: position.lineNumber + lines.length - 1,
          column: lines.length === 1 ? position.column + text.length : lines[lines.length - 1].length + 1
        };
        editor.setPosition(newPosition);
      }
    }

    // Focus the editor
    editor.focus();
  };

  const handleRewrite = async () => {
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please set your Gemini API key in settings first.",
        variant: "destructive",
      });
      return;
    }

    if (!rewritePrompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter instructions for how you want to rewrite the content.",
        variant: "destructive",
      });
      return;
    }

    const selectedData = getSelectedText();
    if (!selectedData || !selectedData.text.trim()) {
      toast({
        title: "No Selection",
        description: "Please select the text you want to rewrite.",
        variant: "destructive",
      });
      return;
    }
    
    setIsRewriting(true);
    
    try {
      console.log('🔄 AIToolbar: Starting rewrite process...');
      // Initialize Gemini service if not already done
      const initialized = await geminiService.ensureInitialized(apiKey);
      if (!initialized) {
        const error = geminiService.getLastError();
        console.error('❌ AIToolbar: Gemini service initialization failed:', error);
        toast({
          title: "Initialization Failed",
          description: error || "Failed to initialize Gemini service. Please check your API key.",
          variant: "destructive",
        });
        return;
      }
      console.log('✅ AIToolbar: Gemini service initialized successfully');

      console.log('🔄 AIToolbar: Calling geminiService.rewriteContent with context...');
      const result = await geminiService.rewriteContent(selectedData.text, rewritePrompt, selectedData.context);
      console.log('📝 AIToolbar: Rewrite result:', { success: result.success, hasContent: !!result.content, error: result.error });

      if (result.success) {
        replaceText(selectedData.selection, result.content);
        setIsRewriteInputOpen(false);
        setRewritePrompt('');
        if (onRewriteInputToggle) {
          onRewriteInputToggle(false);
        }

        console.log('✅ AIToolbar: Rewrite completed successfully');
        toast({
          title: "🎯 Rewritten Successfully",
          description: "Your content has been rewritten according to your instructions!",
        });
      } else {
        console.error('❌ AIToolbar: Rewrite failed:', result.error);
        toast({
          title: "Rewrite Failed",
          description: result.error || "Failed to rewrite content",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ AIToolbar: Unexpected error during rewrite:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while rewriting.",
        variant: "destructive",
      });
    } finally {
      console.log('🏁 AIToolbar: Rewrite process finished');
      setIsRewriting(false);
    }
  };

  const isDisabled = !apiKey || isReformatting || isRewriting;

  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        {/* Reformat AI Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReformat}
          disabled={isDisabled}
          className={`h-8 px-2 ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
          title="Reformat AI - Beautify markdown formatting, fix code blocks, and clean up content"
        >
          {isReformatting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
        </Button>

        {/* Rewrite AI Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleRewriteInput}
          disabled={isDisabled}
          className={`h-8 px-2 ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'} ${isRewriteInputOpen ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-100') : ''}`}
          title="Rewrite AI - Rewrite selected content with custom instructions"
        >
          {isRewriting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
        </Button>

        {/* Smart Paste Button */}
        <SmartPasteButton 
          onInsertMarkdown={handleSmartPaste}
          apiKey={apiKey}
        />
      </div>
    </>
  );
};



export default AIToolbar;