import React, { useState, useEffect } from 'react';
import { Settings, Eye, EyeOff, ExternalLink, Database, Trash2, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
import { safeStorage, getMarkdownContent, getTheme } from '../lib/storage';

interface SettingsDialogProps {
  isDarkMode: boolean;
  apiKey: string;
  onApiKeyChange: (apiKey: string) => void;
}

interface StorageStatus {
  isAvailable: boolean;
  markdownContent: string | null;
  theme: string | null;
  apiKey: string | null;
  error?: string;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ 
  isDarkMode, 
  apiKey, 
  onApiKeyChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'api' | 'storage'>('api');
  const [storageStatus, setStorageStatus] = useState<StorageStatus>({
    isAvailable: false,
    markdownContent: null,
    theme: null,
    apiKey: null
  });
  const { toast } = useToast();

  useEffect(() => {
    setTempApiKey(apiKey);
  }, [apiKey]);

  const checkStorage = () => {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      
      const markdownContent = getMarkdownContent();
      const theme = getTheme();
      const storedApiKey = localStorage.getItem('gemini-api-key');
      
      setStorageStatus({
        isAvailable: true,
        markdownContent: markdownContent ? `${markdownContent.length} chars` : 'Empty',
        theme: theme || 'Default',
        apiKey: storedApiKey ? 'Set' : 'Not set'
      });
    } catch (error) {
      setStorageStatus({
        isAvailable: false,
        markdownContent: null,
        theme: null,
        apiKey: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const clearStorage = () => {
    try {
      safeStorage.removeItem('markdown-editor-content');
      safeStorage.removeItem('markdown-editor-theme');
      safeStorage.removeItem('gemini-api-key');
      onApiKeyChange('');
      setTempApiKey('');
      checkStorage();
      toast({
        title: "Storage Cleared",
        description: "All stored data has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear storage.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStorage();
    }
  }, [isOpen]);

  const handleSave = () => {
    onApiKeyChange(tempApiKey);
    setIsOpen(false);
    
    if (tempApiKey.trim()) {
      toast({
        title: "Settings Saved",
        description: "Your Gemini API key has been saved successfully.",
      });
    } else {
      toast({
        title: "API Key Removed",
        description: "Gemini API key has been removed. AI features will be disabled.",
        variant: "destructive",
      });
    }
  };



  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className={`sm:max-w-md ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <DialogHeader>
          <DialogTitle className={isDarkMode ? 'text-gray-100' : 'text-gray-900'}>
            Settings
          </DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Configure your preferences and debug storage
          </DialogDescription>
        </DialogHeader>
        
        {/* Tabs */}
        <div className="flex space-x-1 mb-4">
          <Button
            variant={activeTab === 'api' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('api')}
            className="flex-1"
          >
            API Settings
          </Button>
          <Button
            variant={activeTab === 'storage' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('storage')}
            className="flex-1"
          >
            <Database className="w-4 h-4 mr-1" />
            Storage
          </Button>
        </div>

        {/* API Tab */}
        {activeTab === 'api' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key" className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>
                Gemini API Key
              </Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key"
                  className={`pr-10 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className={`p-3 rounded-md text-sm ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                Get your free API key at{' '}
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Storage Tab */}
        {activeTab === 'storage' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Status:</span>
                <Badge variant={storageStatus.isAvailable ? 'default' : 'destructive'}>
                  {storageStatus.isAvailable ? 'Available' : 'Error'}
                </Badge>
              </div>
              
              {storageStatus.error && (
                <div className="text-sm text-red-500">
                  {storageStatus.error}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Content: {storageStatus.markdownContent}
                </div>
                <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Theme: {storageStatus.theme}
                </div>
                <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  API Key: {storageStatus.apiKey}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={checkStorage} 
                variant="outline" 
                size="sm"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              <Button 
                onClick={clearStorage} 
                variant="destructive" 
                size="sm"
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setTempApiKey(apiKey);
              setIsOpen(false);
            }}
            className={isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}
          >
            Cancel
          </Button>
          {activeTab === 'api' && (
            <Button 
              onClick={handleSave}
              className={isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              Save
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;