import { useState } from 'react';
import { X } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userName: string;
}

export default function SupportModal({ isOpen, onClose, userEmail, userName }: SupportModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSending(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ subject, message, priority })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi');
      }

      alert('Message envoyé ! Nous vous répondrons sous 48h.');
      setSubject('');
      setMessage('');
      setPriority('Medium');
      onClose();
    } catch (err) {
      setError('Erreur lors de l\'envoi. Réessayez.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Support</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Votre email
            </label>
            <input
              type="email"
              value={userEmail}
              disabled
              className="w-full px-3 py-2 border rounded bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sujet *
            </label>
            <input
              type="text"
              placeholder="Ex: Problème avec l'analyse de facture"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#1E5AA8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priorité
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#1E5AA8] focus:outline-none"
            >
              <option value="Low">Basse</option>
              <option value="Medium">Moyenne</option>
              <option value="High">Haute</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message *
            </label>
            <textarea
              placeholder="Décrivez votre problème en détail..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#1E5AA8] focus:outline-none resize-none"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full py-2 px-4 bg-[#1E5AA8] text-white rounded hover:bg-[#164785] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Envoi en cours...' : 'Envoyer le message'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 pb-4">
          Temps de réponse habituel : 24-48h
        </p>
      </div>
    </div>
  );
}

