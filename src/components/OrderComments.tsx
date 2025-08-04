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
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Interni komentari</h3>
      <div className="space-y-4 mb-6">
        {comments.length > 0 ? (
          comments.map(comment => (
            <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-sm">{comment.user.name || 'Admin'}</p>
                <p className="text-xs text-gray-500">
                  {format(new Date(comment.createdAt), 'dd.MM.yyyy HH:mm', { locale: bs })}
                </p>
              </div>
              <p className="text-gray-700">{comment.text}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">Nema komentara.</p>
        )}
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        <textarea
          {...register('text')}
          rows={3}
          className="w-full p-2 border rounded-md"
          placeholder="Unesite novi komentar..."
          disabled={isSubmitting}
        />
        {errors.text && <p className="text-red-500 text-sm">{errors.text.message}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
        >
          {isSubmitting ? 'Slanje...' : 'Pošalji komentar'}
        </button>
      </form>
    </div>
  );
}
