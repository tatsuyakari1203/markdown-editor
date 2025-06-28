import React, { useState } from 'react';
import { Wand2, RefreshCw, Loader2, Sparkles, Send, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from '../hooks/use-toast';
import geminiService from '../services/geminiService';
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

  const getSelectedText = (): { text: string; selection: any } | null => {
    const editor = editorRef.current;
    if (!editor) return null;

    const selection = editor.getSelection();
    if (!selection) return null;

    const selectedText = editor.getModel()?.getValueInRange(selection) || '';
    return { text: selectedText, selection };
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

    // Initialize Gemini service if not already done
    if (!geminiService.isInitialized()) {
      const initialized = geminiService.initialize({ apiKey });
      if (!initialized) {
        toast({
          title: "Initialization Failed",
          description: "Failed to initialize Gemini service. Please check your API key.",
          variant: "destructive",
        });
        return;
      }
    }

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

    setIsReformatting(true);

    try {
      const result = await geminiService.reformatMarkdown(textToReformat);

      if (result.success) {
        if (isFullDocument) {
          replaceAllText(result.content);
        } else if (selectedData) {
          replaceText(selectedData.selection, result.content);
        }

        toast({
          title: "✨ Reformatted Successfully",
          description: "Your markdown has been beautifully reformatted!",
        });
      } else {
        toast({
          title: "Reformat Failed",
          description: result.error || "Failed to reformat content",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while reformatting.",
        variant: "destructive",
      });
    } finally {
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

    // Initialize Gemini service if not already done
    if (!geminiService.isInitialized()) {
      const initialized = geminiService.initialize({ apiKey });
      if (!initialized) {
        toast({
          title: "Initialization Failed",
          description: "Failed to initialize Gemini service. Please check your API key.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsRewriting(true);

    try {
      const result = await geminiService.rewriteContent(selectedData.text, rewritePrompt);

      if (result.success) {
        replaceText(selectedData.selection, result.content);
        setIsRewriteInputOpen(false);
        setRewritePrompt('');
        if (onRewriteInputToggle) {
          onRewriteInputToggle(false);
        }

        toast({
          title: "🎯 Rewritten Successfully",
          description: "Your content has been rewritten according to your instructions!",
        });
      } else {
        toast({
          title: "Rewrite Failed",
          description: result.error || "Failed to rewrite content",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while rewriting.",
        variant: "destructive",
      });
    } finally {
      setIsRewriting(false);
    }
  };

  const isDisabled = !apiKey || isReformatting || isRewriting;

  return (
    <>
      <div className="flex items-center space-x-1">
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
      </div>


    </>
  );
};



export default AIToolbar;