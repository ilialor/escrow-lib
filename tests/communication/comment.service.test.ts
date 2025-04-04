import { CommentService } from '../../src/communication/comment.service';
import { IComment } from '../../src/interfaces/comment.interface';

// Mock the uuid library
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

describe('CommentService', () => {
  let commentService: CommentService;

  beforeEach(() => {
    // Reset comments before each test by creating a new instance
    commentService = new CommentService();
    // Clear the in-memory array directly (necessary since it's module-scoped)
    // This is a workaround for the in-memory storage approach.
    // In a real app with dependency injection, this wouldn't be needed.
    const comments = require('../../src/communication/comment.service')['comments'];
    comments.length = 0;
  });

  it('should add a new comment', () => {
    const orderId = 'order-123';
    const authorId = 'user-456';
    const text = 'This is a test comment.';

    const newComment = commentService.addComment(orderId, authorId, text);

    expect(newComment).toBeDefined();
    expect(newComment.id).toBe('test-uuid'); // Check if mock uuid is used
    expect(newComment.orderId).toBe(orderId);
    expect(newComment.authorId).toBe(authorId);
    expect(newComment.text).toBe(text);
    expect(newComment.timestamp).toBeInstanceOf(Date);

    // Verify it was added to the internal array (optional check)
    const storedComments = commentService.getCommentsByOrderId(orderId);
    expect(storedComments).toHaveLength(1);
    expect(storedComments[0]).toEqual(newComment);
  });

  it('should retrieve comments by order ID', () => {
    const orderId1 = 'order-abc';
    const orderId2 = 'order-def';

    commentService.addComment(orderId1, 'user-1', 'Comment 1 for abc');
    commentService.addComment(orderId2, 'user-2', 'Comment 1 for def');
    commentService.addComment(orderId1, 'user-3', 'Comment 2 for abc');

    const commentsForOrder1 = commentService.getCommentsByOrderId(orderId1);
    expect(commentsForOrder1).toHaveLength(2);
    expect(commentsForOrder1[0].text).toBe('Comment 1 for abc');
    expect(commentsForOrder1[1].text).toBe('Comment 2 for abc');

    const commentsForOrder2 = commentService.getCommentsByOrderId(orderId2);
    expect(commentsForOrder2).toHaveLength(1);
    expect(commentsForOrder2[0].text).toBe('Comment 1 for def');

    const commentsForNonExistentOrder = commentService.getCommentsByOrderId('non-existent');
    expect(commentsForNonExistentOrder).toHaveLength(0);
  });

  it('should retrieve a comment by its ID', () => {
    const orderId = 'order-xyz';
    const comment1 = commentService.addComment(orderId, 'user-7', 'First comment');
    const comment2 = commentService.addComment(orderId, 'user-8', 'Second comment');

    const foundComment1 = commentService.getCommentById(comment1.id);
    expect(foundComment1).toEqual(comment1);

    const foundComment2 = commentService.getCommentById(comment2.id);
    expect(foundComment2).toEqual(comment2);

    const notFoundComment = commentService.getCommentById('invalid-id');
    expect(notFoundComment).toBeUndefined();
  });
}); 