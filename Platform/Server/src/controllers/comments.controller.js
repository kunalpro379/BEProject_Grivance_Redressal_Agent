import commentsService from '../services/comments.service.js';
import pool from '../config/database.js';

export const addComment = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const { comment, isInternal, attachments } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const grievanceCheck = await pool.query('SELECT id, citizen_id FROM usergrievance WHERE id = $1', [grievanceId]);

    if (grievanceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    const canAddInternal = commentsService.canViewInternalComments(userRole);
    const finalIsInternal = isInternal && canAddInternal;

    const newComment = await commentsService.addComment({
      grievanceId, userId, comment: comment.trim(), isInternal: finalIsInternal, attachments: attachments || null
    });

    const commentWithUser = await commentsService.getCommentById(newComment.id);
    res.status(201).json({ message: 'Comment added successfully', comment: commentWithUser });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment', message: error.message });
  }
};

export const getComments = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const userRole = req.user.role;
    const grievanceCheck = await pool.query('SELECT id, citizen_id FROM usergrievance WHERE id = $1', [grievanceId]);
    if (grievanceCheck.rows.length === 0) return res.status(404).json({ error: 'Grievance not found' });
    const includeInternal = commentsService.canViewInternalComments(userRole);
    const comments = await commentsService.getCommentsByGrievanceId(grievanceId, includeInternal);
    const totalCount = await commentsService.getCommentCount(grievanceId, includeInternal);
    res.json({ grievanceId, comments, totalCount, includesInternal: includeInternal });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments', message: error.message });
  }
};

export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { comment, attachments } = req.body;
    const userId = req.user.id;
    const isOwner = await commentsService.isCommentOwner(commentId, userId);
    if (!isOwner) return res.status(403).json({ error: 'You can only edit your own comments' });
    const updatedComment = await commentsService.updateComment(commentId, userId, { comment, attachments });
    if (!updatedComment) return res.status(404).json({ error: 'Comment not found' });
    const commentWithUser = await commentsService.getCommentById(updatedComment.id);
    res.json({ message: 'Comment updated successfully', comment: commentWithUser });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment', message: error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const existingComment = await commentsService.getCommentById(commentId);
    if (!existingComment) return res.status(404).json({ error: 'Comment not found' });
    const isOwner = existingComment.user_id === userId;
    const isAdmin = userRole === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'You can only delete your own comments' });
    const deleted = await commentsService.deleteComment(commentId, userId);
    if (!deleted && !isAdmin) return res.status(403).json({ error: 'Failed to delete comment' });
    if (isAdmin && !deleted) await pool.query('DELETE FROM grievancecomments WHERE id = $1', [commentId]);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment', message: error.message });
  }
};

export const getCommentCount = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const userRole = req.user.role;
    const grievanceCheck = await pool.query('SELECT id FROM usergrievance WHERE id = $1', [grievanceId]);
    if (grievanceCheck.rows.length === 0) return res.status(404).json({ error: 'Grievance not found' });
    const includeInternal = commentsService.canViewInternalComments(userRole);
    const count = await commentsService.getCommentCount(grievanceId, includeInternal);
    res.json({ grievanceId, commentCount: count });
  } catch (error) {
    console.error('Error getting comment count:', error);
    res.status(500).json({ error: 'Failed to get comment count', message: error.message });
  }
};
