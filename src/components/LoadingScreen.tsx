import React from 'react'
    import { Loader2 } from 'lucide-react'

    export const LoadingScreen: React.FC = () => {
      return (
        <div className="fixed inset-0 bg-gray-100 bg-opacity-80 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <Loader2 className="animate-spin text-blue-600 w-12 h-12 mb-4" />
            <p className="text-gray-600 text-lg">Carregando...</p>
          </div>
        </div>
      )
    }
