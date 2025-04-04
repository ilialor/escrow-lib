import { IComment } from '../interfaces/comment.interface';
import { v4 as uuidv4 } from 'uuid'; // Assuming uuid is installed

// In-memory storage for comments (replace with a database in a real application)
const comments: IComment[] = [];

export class CommentService {
  /**
   * Adds a new comment to an order.
   * @param orderId - The ID of the order.
   * @param authorId - The ID of the comment author.
   * @param text - The comment text.
   * @returns The newly created comment.
   */
  addComment(orderId: string, authorId: string, text: string): IComment {
    const newComment: IComment = {
      id: uuidv4(), // Generate a unique ID
      orderId,
      authorId,
      text,
      timestamp: new Date(),
    };
    comments.push(newComment);
    console.log(`Comment added to order ${orderId}: ${text}`); // Basic logging
    return newComment;
  }

  /**
   * Retrieves all comments for a specific order.
   * @param orderId - The ID of the order.
   * @returns An array of comments for the given order.
   */
  getCommentsByOrderId(orderId: string): IComment[] {
    return comments.filter(comment => comment.orderId === orderId);
  }

  /**
   * Retrieves a specific comment by its ID.
   * @param commentId - The ID of the comment.
   * @returns The comment object or undefined if not found.
   */
  getCommentById(commentId: string): IComment | undefined {
    return comments.find(comment => comment.id === commentId);
  }

  // Optional: Add methods for editing/deleting comments if needed
  // editComment(commentId: string, newText: string): IComment | undefined { ... }
  // deleteComment(commentId: string): boolean { ... }
} 