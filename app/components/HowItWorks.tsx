export default function HowItWorks() {
  return (
    <div id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            See How Easy It Is
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Keeping your business records is as easy as 1, 2, 3.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          {/* Step 1 */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full text-3xl font-bold mb-6">1</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Tap a Button</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              Choose if money is coming in or going out.
            </p>
            <div className="w-full max-w-xs bg-gray-50 p-4 rounded-lg border">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-center p-4 bg-green-500 text-white rounded-xl text-lg font-bold">
                  <span className="text-2xl mr-2">+</span> Money In
                </div>
                <div className="flex items-center justify-center p-4 bg-red-500 text-white rounded-xl text-lg font-bold">
                  <span className="text-2xl mr-2">-</span> Money Out
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full text-3xl font-bold mb-6">2</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Enter Amount</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              Type how much money it was.
            </p>
            <div className="w-full max-w-xs bg-gray-50 p-4 rounded-lg border">
              <p className="text-center text-gray-600 mb-2">How much?</p>
              <div className="w-full text-center text-4xl font-bold p-4 border-2 border-gray-300 rounded-xl">
                150
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full text-3xl font-bold mb-6">3</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Pick a Picture</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              Tap a picture for what the money was for.
            </p>
            <div className="w-full max-w-xs bg-gray-50 p-4 rounded-lg border">
               <div className="grid grid-cols-3 gap-2">
                 <div className="p-2 rounded-xl text-center border-4 border-indigo-600 bg-indigo-100">
                   <div className="text-3xl">💰</div>
                   <p className="text-xs font-semibold">Sales</p>
                 </div>
                 <div className="p-2 rounded-xl text-center bg-white">
                   <div className="text-3xl">📦</div>
                   <p className="text-xs font-semibold">Stock</p>
                 </div>
                 <div className="p-2 rounded-xl text-center bg-white">
                   <div className="text-3xl">🚚</div>
                   <p className="text-xs font-semibold">Transport</p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
