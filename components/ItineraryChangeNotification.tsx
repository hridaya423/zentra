'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, X, Sparkles, ArrowRight, Plus, Minus, Edit } from 'lucide-react';

interface ItineraryChangeNotificationProps {
  isVisible: boolean;
  message: string;
  changes?: {
    type: 'modification' | 'addition' | 'removal';
    description: string;
    affectedDays?: number[];
    before?: string;
    after?: string;
    activityName?: string;
  }[];
  onClose: () => void;
}

export default function ItineraryChangeNotification({ 
  isVisible, 
  message, 
  changes = [], 
  onClose 
}: ItineraryChangeNotificationProps) {
  const [show, setShow] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [highlightedChange, setHighlightedChange] = useState<number | null>(null);
  const [allChangesShown, setAllChangesShown] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      setAllChangesShown(false);
      
      if (changes.length > 1) {
        let index = 0;
        const interval = setInterval(() => {
          setActiveIndex(index);
          index = (index + 1) % changes.length;
          
          if (index === 0) {
            clearInterval(interval);
            setActiveIndex(null);
            setAllChangesShown(true);
            
            const dismissTimer = setTimeout(() => {
              setShow(false);
              setTimeout(onClose, 300);
            }, 3000);
            
            return () => clearTimeout(dismissTimer);
          }
        }, 1800); 
        
        return () => {
          clearInterval(interval);
          setActiveIndex(null);
        };
      } else {
        const shownTimer = setTimeout(() => {
          setAllChangesShown(true);
        }, 2000);
        
        const dismissTimer = setTimeout(() => {
          setShow(false);
          setTimeout(onClose, 300);
        }, 5000);
        
        return () => {
          clearTimeout(shownTimer);
          clearTimeout(dismissTimer);
        };
      }
    } else {
      setShow(false);
    }
  }, [isVisible, onClose, changes.length]);

  const getIconForChangeType = (type: 'modification' | 'addition' | 'removal') => {
    switch (type) {
      case 'addition':
        return <Plus className="w-5 h-5 text-green-600" />;
      case 'modification':
        return <Edit className="w-5 h-5 text-amber-600" />;
      case 'removal':
        return <Minus className="w-5 h-5 text-red-600" />;
    }
  };

  const getChangeClass = (type: 'modification' | 'addition' | 'removal') => {
    switch (type) {
      case 'addition': return 'change-indicator-add';
      case 'modification': return 'change-indicator-modify';
      case 'removal': return 'change-indicator-remove';
    }
  };

  return (
    <div className={`fixed top-6 right-6 z-50 transition-all duration-300 ${
      show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-5 max-w-md">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-2 rounded-full">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Itinerary Updated</h3>
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShow(false);
              setTimeout(onClose, 300);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {changes.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
              <Sparkles className="w-4 h-4 mr-1 text-blue-500" />
              Changes Made:
            </h4>
            <ul className="space-y-2">
              {changes.map((change, index) => (
                <li 
                  key={index} 
                  className={`text-sm text-gray-700 flex items-start p-2 rounded-lg transition-all duration-300 ${getChangeClass(change.type)}
                    ${activeIndex === index ? 'bg-gray-50 border border-gray-200 shadow-sm' : 
                      highlightedChange === index ? 'bg-gray-50 border border-gray-100' : 'border border-transparent'}
                  `}
                  onClick={() => {
                    if (activeIndex === null) {
                      setHighlightedChange(index === highlightedChange ? null : index);
                    }
                  }}
                >
                  <span className="mr-2 mt-0.5 flex-shrink-0">
                    {getIconForChangeType(change.type)}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">
                      {change.description}
                    </p>
                    {change.affectedDays && (
                      <p className="text-blue-600 font-medium text-xs mt-1">
                        Day{change.affectedDays.length > 1 ? 's' : ''}: {change.affectedDays.join(', ')}
                      </p>
                    )}
                    
                    {(change.before || change.after) && (
                      <div className={`mt-2 p-2 bg-white rounded border border-gray-100 text-xs
                        transition-all duration-300 overflow-hidden
                        ${activeIndex === index || highlightedChange === index ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0 border-0'}`}
                      >
                        {change.type === 'modification' && (
                          <>
                            <div className="mb-1">
                              <span className="text-gray-500 font-medium">Before:</span>
                              <p className="text-gray-700 bg-red-50/30 rounded p-1 mt-1">{change.before}</p>
                            </div>
                            <div className="flex items-center my-1 text-blue-400">
                              <div className="flex-1 h-px bg-blue-100"></div>
                              <ArrowRight className="w-3 h-3 mx-1" />
                              <div className="flex-1 h-px bg-blue-100"></div>
                            </div>
                            <div>
                              <span className="text-gray-500 font-medium">After:</span>
                              <p className="text-teal-700 bg-green-50/30 rounded p-1 mt-1">{change.after}</p>
                            </div>
                          </>
                        )}
                        {change.type === 'addition' && (
                          <div>
                            <span className="text-gray-500 font-medium">Added:</span>
                            <p className="text-green-700 bg-green-50/30 rounded p-1 mt-1">{change.after}</p>
                          </div>
                        )}
                        {change.type === 'removal' && (
                          <div>
                            <span className="text-gray-500 font-medium">Removed:</span>
                            <p className="text-red-700 bg-red-50/30 rounded p-1 mt-1">{change.before}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            
            {changes.length > 1 && (
              <div className="flex justify-center mt-2">
                {changes.map((_, index) => (
                  <button 
                    key={index} 
                    className={`w-2 h-2 mx-1 rounded-full transition-all 
                      ${activeIndex === index || highlightedChange === index ? 
                        'bg-blue-500 w-3' : 'bg-blue-200'}
                    `}
                    onClick={() => {
                      setActiveIndex(null);
                      setHighlightedChange(index);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-3 pt-2 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              {allChangesShown ? "All changes shown" : "Viewing changes..."}
            </p>
            <button 
              onClick={() => {
                setShow(false);
                setTimeout(onClose, 300);
              }}
              className="text-xs font-medium text-blue-500 hover:text-blue-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 