export const createResolvers = (items) => ({
  Query: {
    playlist: (_, { id }) => {
      if (id === "mixed") return { id, name: "Commute", items };
      if (id === "known") return { id, name: "Familiar", items: items.slice(0, 2) };
      return null;
    },
    sanity: () => "alive",
  },
  MediaItem: { __resolveType: (item) => item.__typename },
});
