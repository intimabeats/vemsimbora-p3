import React, { useState } from 'react'
import { LogIn } from 'lucide-react'

export const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement Firebase authentication
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-96">
        <div className="text-center mb-6">
          <img 
            src="https://images.unsplash.com/photo-1560179707-f14e90ef3623" 
            alt="Vem Simbora Logo" 
            className="w-20 h-20 rounded-full mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-800">Vem Simbora</h1>
          <p className="text-gray-500">Task Management Platform</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required 
          />
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
          >
            <LogIn className="mr-2" /> Login
          </button>
        </form>
        <div className="text-center mt-4">
          <a href="/forgot-password" className="text-blue-600 hover:underline">
            Forgot Password?
          </a>
        </div>
      </div>
    </div>
  )
}
