export const createResolvers = (records) => {
  const reference = ({ id }) => records.find((record) => record.id === id) ?? null;
  return {
    Query: { mediaItem: (_, ref) => reference(ref) },
    MediaItem: {
      __resolveReference: reference,
      __resolveType: (record) => record.__typename,
    },
  };
};
