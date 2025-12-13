import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, Trash2, Edit2, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CommentsSection = ({ entityType, entityId, compact = false }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    if (entityType && entityId) {
      loadComments();
    }
  }, [entityType, entityId]);

  const loadComments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/comments/${entityType}/${entityId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments(response.data);
    } catch (error) {
      console.error('Error loading comments:', error);
      if (error.response?.status !== 404) {
        toast.error('Помилка завантаження коментарів');
      }
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Введіть текст коментаря');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/comments`,
        {
          entity_type: entityType,
          entity_id: entityId,
          text: newComment.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setNewComment('');
      await loadComments();
      toast.success('Коментар додано');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Помилка додавання коментаря');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editText.trim()) {
      toast.error('Введіть текст коментаря');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/comments/${commentId}`,
        { text: editText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setEditingId(null);
      setEditText('');
      await loadComments();
      toast.success('Коментар оновлено');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Помилка оновлення коментаря');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Ви впевнені, що хочете видалити цей коментар?')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/api/comments/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      await loadComments();
      toast.success('Коментар видалено');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Помилка видалення коментаря');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="w-5 h-5" />
          Коментарі
          {comments.length > 0 && (
            <span className="text-sm text-gray-500">({comments.length})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Add new comment */}
        <div className="mb-4">
          <div className="flex gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Додати коментар..."
              className="flex-1 min-h-[80px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={loading}
            />
          </div>
          <div className="flex justify-end mt-2">
            <Button
              onClick={handleAddComment}
              disabled={loading || !newComment.trim()}
              size="sm"
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Надіслати
            </Button>
          </div>
        </div>

        {/* Comments list */}
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Коментарів поки немає</p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment._id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                {editingId === comment._id ? (
                  // Edit mode
                  <div>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full min-h-[80px] p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      disabled={loading}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        onClick={() => {
                          setEditingId(null);
                          setEditText('');
                        }}
                        variant="outline"
                        size="sm"
                        disabled={loading}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Скасувати
                      </Button>
                      <Button
                        onClick={() => handleUpdateComment(comment._id)}
                        size="sm"
                        disabled={loading || !editText.trim()}
                      >
                        Зберегти
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">
                          {comment.author_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(comment.created_at)}
                          {comment.updated_at && ' (відредаговано)'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          onClick={() => {
                            setEditingId(comment._id);
                            setEditText(comment.text);
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          disabled={loading}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteComment(comment._id)}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={loading}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {comment.text}
                    </p>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CommentsSection;
