import React, { useState } from 'react';
import { Wand2, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';
import geminiService from '../services/geminiService';

import { SmartPasteButton } from './SmartPasteButton';
import type { editor } from 'monaco-editor';

interface AIToolbarProps {
  editorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>;
  isDarkMode: boolean;
  apiKey: string;
  onRewriteInputToggle?: (isOpen: boolean) => void;
  isRewriting?: boolean;
}

const AIToolbar: React.FC<AIToolbarProps> = ({ editorRef, isDarkMode, apiKey, onRewriteInputToggle, isRewriting = false }) => {
  const [isReformatting, setIsReformatting] = useState(false);
  const [rewritePrompt, setRewritePrompt] = useState('');
  const [isRewriteInputOpen, setIsRewriteInputOpen] = useState(false);
  const [reformatProgress, setReformatProgress] = useState<{ current: number; total: number; status: string } | null>(null);
  const { toast } = useToast();

  const getAllText = (): string => {
    const editor = editorRef.current;
    if (!editor) return '';
    return editor.getValue();
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

  const getSelectedText = () => {
    const editor = editorRef.current;
    if (!editor) return null;

    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) return null;

    const model = editor.getModel();
    if (!model) return null;

    const selectedText = model.getValueInRange(selection);
    return {
      text: selectedText,
      selection: selection
    };
  };

  const replaceText = (selection: editor.ISelection, newText: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.executeEdits('ai-toolbar', [{
      range: selection,
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
      
      // Progress callback for chunked processing
      const onProgress = (progress: { current: number; total: number; status: string }) => {
        setReformatProgress(progress);
        console.log(`📊 Reformat progress: ${progress.current}/${progress.total} - ${progress.status}`);
      };
      
      const result = await geminiService.reformatMarkdown(textToReformat, onProgress);
      console.log('📝 AIToolbar: Reformat result:', { 
        success: result.success, 
        hasContent: !!result.content, 
        error: result.error,
        chunksProcessed: result.chunksProcessed,
        totalChunks: result.totalChunks
      });

      if (result.success) {
        if (isFullDocument) {
          replaceAllText(result.content);
        } else if (selectedData) {
          replaceText(selectedData.selection, result.content);
        }

        console.log('✅ AIToolbar: Reformat completed successfully');
        
        const successMessage = result.totalChunks && result.totalChunks > 1 
          ? `Your markdown has been beautifully reformatted! (Processed ${result.chunksProcessed}/${result.totalChunks} chunks)`
          : "Your markdown has been beautifully reformatted!";
        
        toast({
          title: "✨ Reformatted Successfully",
          description: successMessage,
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
      setReformatProgress(null);
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
          title={reformatProgress ? `${reformatProgress.status} (${reformatProgress.current}/${reformatProgress.total})` : "Reformat AI - Beautify markdown formatting, fix code blocks, and clean up content"}
        >
          {isReformatting ? (
            <div className="flex items-center gap-1">
              <Loader2 className="w-4 h-4 animate-spin" />
              {reformatProgress && reformatProgress.total > 1 && (
                <span className="text-xs font-mono">
                  {reformatProgress.current}/{reformatProgress.total}
                </span>
              )}
            </div>
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