// Define the structure for a comment object
export interface IComment {
  id: string; // Unique identifier for the comment
  orderId: string; // ID of the order the comment belongs to
  authorId: string; // ID of the user who wrote the comment
  text: string; // The content of the comment
  timestamp: Date; // When the comment was created
} 