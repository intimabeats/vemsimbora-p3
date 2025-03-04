import React, { useState } from 'react'
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  CheckCircle 
} from 'lucide-react'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  itemName: string
  warningMessage?: string
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  warningMessage = "Esta ação não pode ser desfeita."
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirmDelete = async () => {
    setIsLoading(true)
    setError(null)

    try {
      await onConfirm()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir o item')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold flex items-center text-red-600">
            <AlertTriangle className="mr-2" />
            Confirmar Exclusão
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-700">
            Tem certeza que deseja excluir <strong>{itemName}</strong>?
          </p>
          <p className="text-sm text-red-500">
            {warningMessage}
          </p>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center">
              <AlertTriangle className="mr-2" />
              {error}
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="w-full py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={isLoading}
              className={`w-full py-2 rounded-lg text-white transition flex items-center justify-center
                ${isLoading 
                  ? 'bg-red-400 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700'
                }`}
            >
              {isLoading ? (
                'Excluindo...'
              ) : (
                <>
                  <Trash2 className="mr-2" /> Excluir
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
