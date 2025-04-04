# Communication Features

This document describes features related to communication within the escrow process, such as order comments.

## Order Comments

The library provides a `CommentService` to manage comments associated with specific orders. This allows participants (buyers, sellers, arbiters) to discuss details related to an order directly within the system context.

### Interface (`IComment`)

Comments are represented by the `IComment` interface:

```typescript
export interface IComment {
  id: string;        // Unique identifier for the comment
  orderId: string;   // ID of the order the comment belongs to
  authorId: string;  // ID of the user who wrote the comment
  text: string;      // The content of the comment
  timestamp: Date;   // When the comment was created
}
```

### Service (`CommentService`)

The `CommentService` provides methods to interact with comments.

**Note:** The current implementation uses in-memory storage. For production use, this should be replaced with a persistent storage solution (e.g., database).

**Methods:**

*   `addComment(orderId: string, authorId: string, text: string): IComment`
    *   Adds a new comment to the specified order.
    *   Generates a unique ID and timestamp.
    *   Returns the newly created comment object.
*   `getCommentsByOrderId(orderId: string): IComment[]`
    *   Retrieves an array of all comments associated with the given order ID.
    *   Returns an empty array if no comments are found.
*   `getCommentById(commentId: string): IComment | undefined`
    *   Retrieves a specific comment by its unique ID.
    *   Returns the comment object or `undefined` if not found.

### Usage Example

```typescript
import { EscrowManager, CommentService } from 'escrow-lib'; // Assuming library entry point

// Initialize services (example, might be handled by EscrowManager)
const commentService = new CommentService();

const orderId = 'some-order-id';
const userId = 'user-abc';

// Add a comment
const newComment = commentService.addComment(orderId, userId, 'Can you confirm the shipping address?');
console.log('Comment added:', newComment);

// Get all comments for the order
const allComments = commentService.getCommentsByOrderId(orderId);
console.log('All comments for order:', allComments);

// Get a specific comment
const specificComment = commentService.getCommentById(newComment.id);
console.log('Specific comment:', specificComment);
```
