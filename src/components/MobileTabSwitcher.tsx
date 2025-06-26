import React from 'react'
import { Button } from './ui/button'
import { FileText, Eye } from 'lucide-react'

interface MobileTabSwitcherProps {
  activeTab: 'editor' | 'preview'
  onTabChange: (tab: 'editor' | 'preview') => void
  isDarkMode: boolean
}

const MobileTabSwitcher: React.FC<MobileTabSwitcherProps> = ({
  activeTab,
  onTabChange,
  isDarkMode
}) => {
  return (
    <div className={`flex w-full border-b transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gray-800/80 border-gray-700' 
        : 'bg-gray-50/80 border-gray-200'
    }`}>
      <Button
        variant={activeTab === 'editor' ? 'default' : 'ghost'}
        className={`flex-1 rounded-none border-0 h-12 text-sm font-medium transition-all duration-200 ${
          activeTab === 'editor'
            ? isDarkMode
              ? 'bg-blue-600 text-white border-b-2 border-blue-400'
              : 'bg-blue-500 text-white border-b-2 border-blue-300'
            : isDarkMode
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
        }`}
        onClick={() => onTabChange('editor')}
      >
        <FileText className="w-4 h-4 mr-2" />
        Editor
      </Button>
      
      <Button
        variant={activeTab === 'preview' ? 'default' : 'ghost'}
        className={`flex-1 rounded-none border-0 h-12 text-sm font-medium transition-all duration-200 ${
          activeTab === 'preview'
            ? isDarkMode
              ? 'bg-blue-600 text-white border-b-2 border-blue-400'
              : 'bg-blue-500 text-white border-b-2 border-blue-300'
            : isDarkMode
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
        }`}
        onClick={() => onTabChange('preview')}
      >
        <Eye className="w-4 h-4 mr-2" />
        Preview
      </Button>
    </div>
  )
}

export default MobileTabSwitcher