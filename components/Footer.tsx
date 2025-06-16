
export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-cyan-500"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg">
              <img src="/logo.png" alt="Zentra Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-2xl font-display text-gradient-primary">Zentra</h3>
              <p className="text-sm text-gray-400 font-medium -mt-1">your journey starts here</p>
            </div>
          </div>
          
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto font-body">
            Powered by AI to create extraordinary journeys that inspire, delight, and create memories for a lifetime.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-sm text-gray-400">
            <span>Made with ❤️ by Hridya</span>
          </div>
        </div>
      </div>
    </footer>
  );
} 