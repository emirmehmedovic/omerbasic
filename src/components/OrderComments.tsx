'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { bs } from 'date-fns/locale';

// Tipovi moraju odgovarati onome što dohvaćamo iz baze
// Ovdje definiramo tipove eksplicitno da izbjegnemo importovanje sa servera
type CommentUser = {
  name: string | null;
  image: string | null;
};

type Comment = {
  id: string;
  text: string;
  createdAt: string;
  user: CommentUser;
};

interface OrderCommentsProps {
  orderId: string;
  initialComments: Comment[];
}

const commentSchema = z.object({
  text: z.string().min(1, 'Komentar ne može biti prazan.'),
});

type CommentFormData = z.infer<typeof commentSchema>;

export default function OrderComments({ orderId, initialComments }: OrderCommentsProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
  });

  const onSubmit = async (data: CommentFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Slanje komentara nije uspjelo.');
      }

      const newComment = await response.json();
      setComments(prev => [...prev, newComment]);
      reset();
      toast.success('Komentar je uspješno dodan!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Došlo je do greške.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Interni komentari ({comments.length})
        </h3>
      </div>
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          {comments.length > 0 ? (
            comments.map(comment => (
              <div key={comment.id} className="bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm p-4 rounded-xl border border-amber/10">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-semibold text-sm text-gray-900">{comment.user.name || 'Admin'}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(comment.createdAt), 'dd.MM.yyyy HH:mm', { locale: bs })}
                  </p>
                </div>
                <p className="text-gray-700">{comment.text}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
                  <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-gray-600 font-medium">Nema komentara</p>
                <p className="text-gray-500 text-sm">Dodajte prvi komentar za ovu narudžbu</p>
              </div>
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-4 border-t border-amber/20">
          <textarea
            {...register('text')}
            rows={3}
            className="w-full p-3 bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 resize-none"
            placeholder="Unesite novi komentar..."
            disabled={isSubmitting}
          />
          {errors.text && <p className="text-red-500 text-sm">{errors.text.message}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            {isSubmitting ? 'Slanje...' : 'Pošalji komentar'}
          </button>
        </form>
      </div>
    </div>
  );
}
