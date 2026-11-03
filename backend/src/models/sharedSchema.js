// backend/src/models/sharedSchema.js
//
// Shared editorial lifecycle fields, spread into every admin-managed content
// schema (Post, Category, Tag, Media) to keep trash/draft/publish behavior
// consistent across the data layer. JavaScript has no `interface` construct,
// so this plain object stands in for what would be `ITrashLifecycle` in a
// typed codebase.
//
// Locked decision (state transfer doc §5.2): exactly three status values —
// 'DRAFT' | 'PUBLISHED' | 'TRASHED'. Permanent delete is a hard Mongo
// delete, never a fourth enum value such as 'DELETED'.

export const trashLifecycleOptions = {
  status: {
    type: String,
    required: true,
    enum: ['DRAFT', 'PUBLISHED', 'TRASHED'],
    default: 'DRAFT',
    index: true,
  },
  previousStatus: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED'],
    default: null,
  },
  trashedAt: {
    type: Date,
    default: null,
    index: true,
  },
};

export default trashLifecycleOptions;
