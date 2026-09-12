export const createResolvers = (ratings) => ({
  MediaItem: {
    __resolveReference: (reference) => ({ id: reference.id }),
    averageRating: ({ id }) => ratings[id]?.averageRating ?? null,
    reviewCount: ({ id }) => ratings[id]?.reviewCount ?? 0,
  },
});
