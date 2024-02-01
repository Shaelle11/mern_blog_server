const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const PostSchema = new Schema({
  title: String,
  summary: String,
  content: String,
  cover: {
    url: String, // Store the blob URL
    // You may include additional properties related to the cover image if needed
    // For example, you could include width, height, etc.
  },
  author: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
});

const PostModel = model('Post', PostSchema);
module.exports = PostModel;
