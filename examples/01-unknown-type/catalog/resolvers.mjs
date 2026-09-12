export const createResolvers = (records) => {
  const reference = ({ id }) => records.find((record) => record.id === id) ?? null;
  return {
    Query: { mediaItem: (_, ref) => reference(ref) },
    MediaItem: { __resolveType: (record) => record.__typename },
    Song: { __resolveReference: reference },
    Podcast: { __resolveReference: reference },
    Audiobook: { __resolveReference: reference },
  };
};
