export const createResolvers = (ids) => ({
  Query: {
    playlist: (_, { id }) =>
      id === "mixed"
        ? { id, name: "Commute", items: ids.map((mediaId) => ({ id: mediaId })) }
        : null,
  },
});
