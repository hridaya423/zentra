'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Clock, MapPin, DollarSign, Loader2, CheckCircle, AlertCircle, ArrowRight, Plus, Minus, Edit } from 'lucide-react';
import { StructuredItinerary } from '@/types/travel';
import ItineraryChangeNotification from './ItineraryChangeNotification';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: string[];
  changes?: {
    type: 'modification' | 'addition' | 'removal';
    description: string;
    affectedDays?: number[];
    before?: string;
    after?: string;
    activityName?: string;
  }[];
  requiresConfirmation?: boolean;
}

interface TravelAssistantChatProps {
  itinerary: StructuredItinerary;
  onItineraryUpdate: (updatedItinerary: StructuredItinerary) => void;
  userPreferences?: {
    budget: string;
    travelStyle: string;
    interests: string[];
    travelers: number;
  };
  isOpen: boolean;
  onToggle: () => void;
}

export default function TravelAssistantChat({ 
  itinerary, 
  onItineraryUpdate, 
  userPreferences,
  isOpen,
  onToggle 
}: TravelAssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hi! I'm your travel assistant. I can help you modify your ${itinerary.destinations.map(d => d.name).join(' & ')} itinerary. Try saying things like:

• "Make day 3 less busy"
• "Add more cultural activities" 
• "What's the best way to get around?"
• "This is too expensive, help me save money"

What would you like to change or know about your trip?`,
      timestamp: new Date().toISOString(),
      suggestions: [
        "Make my itinerary less busy",
        "Add more cultural activities",
        "Help me save money",
        "What should I pack?"
      ]
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{
    itinerary: StructuredItinerary;
    changes: {
      type: 'modification' | 'addition' | 'removal';
      description: string;
      affectedDays?: number[];
      before?: string;
      after?: string;
      activityName?: string;
    }[];
  } | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState<{
    message: string;
    changes: {
      type: 'modification' | 'addition' | 'removal';
      description: string;
      affectedDays?: number[];
      before?: string;
      after?: string;
      activityName?: string;
    }[];
  }>({ message: '', changes: [] });
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      console.log("Sending message to chat assistant:", message);
      console.log("Current itinerary:", JSON.stringify(itinerary).substring(0, 200) + "...");
      
      const response = await fetch('/api/chat-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          itinerary,
          chatHistory: messages,
          userPreferences
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get response: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Received chat assistant response:", data);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        suggestions: data.suggestions,
        changes: data.changes,
        requiresConfirmation: data.requiresConfirmation
      };

      setMessages(prev => [...prev, assistantMessage]);

      
      if (data.updatedItinerary) {
        
        if (data.requiresConfirmation) {
          setPendingChanges({
            itinerary: data.updatedItinerary,
            changes: data.changes || []
          });
        } else {
          console.log("Changes don't require confirmation, applying immediately");
          onItineraryUpdate(data.updatedItinerary);
          
          setTimeout(() => {
            const confirmationMessage: ChatMessage = {
              role: 'assistant',
              content: "✅ Your itinerary has been updated! The changes are now reflected in your trip plan.",
              timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, confirmationMessage]);
            
            
            setNotificationData({
              message: "Your itinerary has been successfully updated!",
              changes: data.changes || []
            });
            setShowNotification(true);
          }, 500);
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again or rephrase your request.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const confirmChanges = () => {
    if (pendingChanges) {
      console.log("Confirming pending changes...");
      console.log("Changes to apply:", pendingChanges.changes);
      
      try {
        
        onItineraryUpdate(pendingChanges.itinerary);
        console.log("Updated itinerary applied successfully");
        
        
        setNotificationData({
          message: "Your itinerary has been successfully updated!",
          changes: pendingChanges.changes
        });
        setShowNotification(true);
        
        
        setPendingChanges(null);
        
        
        const confirmationMessage: ChatMessage = {
          role: 'assistant',
          content: "✅ Perfect! I've applied all the changes to your itinerary. Your trip plan has been updated.",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, confirmationMessage]);
        
        
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error("Error applying itinerary changes:", error);
        
        
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: "I'm sorry, I encountered an error while applying the changes. Please try again.",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
        
        
        setTimeout(scrollToBottom, 100);
      }
    }
  };

  const rejectChanges = () => {
    setPendingChanges(null);
    const rejectionMessage: ChatMessage = {
      role: 'assistant',
      content: "No problem! Your original itinerary remains unchanged. Feel free to ask for different modifications.",
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, rejectionMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputMessage);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 z-50"
      >
        <Bot className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border border-gray-200 
                flex flex-col z-50 overflow-hidden transition-all duration-300 ease-in-out
                ${isExpanded ? 'w-[800px] h-[750px]' : 'w-[450px] h-[650px]'}`}
    >
      
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 p-2 rounded-full">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">Travel Assistant</h3>
            <p className="text-xs text-teal-100">Ready to help with your trip</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleExpanded}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-full"
            title={isExpanded ? "Collapse chat" : "Expand chat"}
          >
            <ArrowRight className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`} />
          </button>
          <button
            onClick={onToggle}
            className="text-white/80 hover:text-white transition-colors ml-2"
          >
            ×
          </button>
        </div>
      </div>

      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${message.role === 'user' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-2xl p-3 animate-fadeIn`}>
              <div className="flex items-start space-x-2">
                {message.role === 'assistant' && (
                  <Bot className="w-4 h-4 mt-1 text-teal-600" />
                )}
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-teal-100' : 'text-gray-500'}`}>
                    {formatTimestamp(message.timestamp)}
                  </p>
                </div>
                {message.role === 'user' && (
                  <User className="w-4 h-4 mt-1 text-teal-100" />
                )}
              </div>

              
              {message.changes && message.changes.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                    <Sparkles className="w-4 h-4 mr-1" />
                    Changes Made:
                  </h4>
                  <ul className="space-y-2">
                    {message.changes.map((change, idx) => (
                      <li key={idx} className="text-xs text-blue-800">
                        <div className="flex items-start mb-1">
                          <span className="mr-2 mt-0.5">
                            {change.type === 'addition' && <Plus className="w-3 h-3 text-green-600" />}
                            {change.type === 'modification' && <Edit className="w-3 h-3 text-amber-600" />}
                            {change.type === 'removal' && <Minus className="w-3 h-3 text-red-600" />}
                          </span>
                          <span className="flex-1 font-medium">{change.description}</span>
                        </div>
                        
                        
                        {change.affectedDays && change.affectedDays.length > 0 && (
                          <div className="ml-5 mb-2 text-blue-600 font-medium">
                            Day{change.affectedDays.length > 1 ? 's' : ''}: {change.affectedDays.join(', ')}
                          </div>
                        )}
                        
                        
                        {(change.before || change.after) && (
                          <div className="ml-5 mt-1 p-2 bg-white rounded border border-blue-100">
                            {change.type === 'modification' && (
                              <>
                                <div className="mb-1">
                                  <span className="text-gray-500 font-medium">Before:</span>
                                  <p className="text-gray-700">{change.before}</p>
                                </div>
                                <div className="flex items-center my-1 text-blue-400">
                                  <div className="flex-1 h-px bg-blue-100"></div>
                                  <ArrowRight className="w-3 h-3 mx-1" />
                                  <div className="flex-1 h-px bg-blue-100"></div>
                                </div>
                                <div>
                                  <span className="text-gray-500 font-medium">After:</span>
                                  <p className="text-teal-700">{change.after}</p>
                                </div>
                              </>
                            )}
                            {change.type === 'addition' && (
                              <div>
                                <span className="text-gray-500 font-medium">Added:</span>
                                <p className="text-green-700">{change.after}</p>
                              </div>
                            )}
                            {change.type === 'removal' && (
                              <div>
                                <span className="text-gray-500 font-medium">Removed:</span>
                                <p className="text-red-700">{change.before}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-600">Try asking:</p>
                  <div className="flex flex-wrap gap-2">
                    {message.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-50 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        
        {pendingChanges && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 animate-pulse">
            <div className="flex items-center mb-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
              <h4 className="font-semibold text-yellow-900">Confirm Changes</h4>
            </div>
                          <p className="text-sm text-yellow-800 mb-3">
                I&apos;ve prepared the following changes to your itinerary:
              </p>
            
            
            <div className="mb-4 max-h-40 overflow-y-auto p-2 bg-white/60 rounded border border-yellow-100">
              <ul className="space-y-2 text-sm">
                {pendingChanges.changes.map((change, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="mr-2 mt-0.5">
                      {change.type === 'addition' && <Plus className="w-3 h-3 text-green-600" />}
                      {change.type === 'modification' && <Edit className="w-3 h-3 text-amber-600" />}
                      {change.type === 'removal' && <Minus className="w-3 h-3 text-red-600" />}
                    </span>
                    <span className="text-gray-800">{change.description}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={confirmChanges}
                className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Apply Changes
              </button>
              <button
                onClick={rejectChanges}
                className="flex-1 bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-400 transition-colors"
              >
                Keep Original
              </button>
            </div>
          </div>
        )}

        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl p-3 flex items-center space-x-2">
              <div className="relative">
                <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
                <div className="absolute inset-0 border-t-2 border-teal-200 rounded-full animate-ping opacity-20"></div>
              </div>
              <span className="text-sm text-gray-600">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your trip..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(inputMessage)}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-teal-600 text-white p-2 rounded-full hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => handleSuggestionClick("Make my itinerary less busy")}
            className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors flex items-center"
            disabled={isLoading}
          >
            <Clock className="w-3 h-3 mr-1" />
            Less Busy
          </button>
          <button
            onClick={() => handleSuggestionClick("Add more cultural activities")}
            className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors flex items-center"
            disabled={isLoading}
          >
            <MapPin className="w-3 h-3 mr-1" />
            More Culture
          </button>
          <button
            onClick={() => handleSuggestionClick("Help me save money")}
            className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors flex items-center"
            disabled={isLoading}
          >
            <DollarSign className="w-3 h-3 mr-1" />
            Save Money
          </button>
        </div>
      </div>

      
      <ItineraryChangeNotification
        isVisible={showNotification}
        message={notificationData.message}
        changes={notificationData.changes}
        onClose={() => setShowNotification(false)}
      />
    </div>
  );
} 