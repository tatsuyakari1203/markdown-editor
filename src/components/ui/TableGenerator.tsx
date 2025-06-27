import React, { useState } from 'react';
import { Button } from './button';

interface TableGeneratorProps {
  onSelect: (rows: number, cols: number) => void;
  isDarkMode: boolean;
}

const TableGenerator: React.FC<TableGeneratorProps> = ({ onSelect, isDarkMode }) => {
  const [hovered, setHovered] = useState({ rows: 0, cols: 0 });

  const handleSelect = (rows: number, cols: number) => {
    onSelect(rows, cols);
  };

  return (
    <div className={`p-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 100 }).map((_, index) => {
          const row = Math.floor(index / 10) + 1;
          const col = (index % 10) + 1;
          const isHovered = row <= hovered.rows && col <= hovered.cols;

          return (
            <div
              key={index}
              className={`w-6 h-6 border rounded cursor-pointer transition-colors duration-150 ${
                isHovered
                  ? (isDarkMode ? 'bg-blue-500 border-blue-400' : 'bg-blue-500 border-blue-600')
                  : (isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300')
              }`}
              onMouseEnter={() => setHovered({ rows: row, cols: col })}
              onClick={() => handleSelect(row, col)}
            />
          );
        })}
      </div>
      <div className="text-center mt-2 text-sm">
        {hovered.rows > 0 && hovered.cols > 0 ? (
          <span>{hovered.cols}x{hovered.rows} Table</span>
        ) : (
          <span>Select table size</span>
        )}
      </div>
    </div>
  );
};

export default TableGenerator;
